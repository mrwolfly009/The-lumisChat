// 1. Firebase Configuration (Kept same)
const firebaseConfig = {
    apiKey: "AIzaSyBpOkznMZ4G-t7M9unXegy_MSwFsQdU3aM",
    authDomain: "the-lumischat.firebaseapp.com",
    databaseURL: "https://the-lumischat-default-rtdb.firebaseio.com",
    projectId: "the-lumischat",
    storageBucket: "the-lumischat.firebasestorage.app",
    messagingSenderId: "753401762893",
    appId: "1:753401762893:web:0746c51a1ff5a744715604"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const database = firebase.database();

// 2. Global Variables
let nickname = localStorage.getItem("chat_nickname") || "";
let activeChannel = "general-chat";
let messageKeyToDelete = null; 
let channelKeyToDelete = null;
let channelNameToDelete = null;
// Tracker for avatar grouping
let lastSender = null; 

// 3. DOM Elements
const nameModal = document.getElementById('name-modal');
const nicknameInput = document.getElementById('nickname-input');
const joinBtn = document.getElementById('join-btn');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const activeChannelTitle = document.getElementById('active-channel-name');
const headerDeleteBtn = document.getElementById('delete-current-channel');

const channelModal = document.getElementById('channel-modal');
const newChannelNameInput = document.getElementById('new-channel-name');
const newChannelIconInput = document.getElementById('new-channel-icon');
const createChannelBtn = document.getElementById('create-channel-btn');

const msgDeleteModal = document.getElementById('confirm-msg-modal');
const msgDeleteConfirmBtn = document.getElementById('delete-msg-confirm-btn');
const msgDeleteCancelBtn = document.getElementById('delete-msg-cancel-btn');

const channelDeleteModal = document.getElementById('confirm-channel-modal');
const channelDeleteNameDisplay = document.getElementById('del-channel-name-display');
const channelDeleteConfirmBtn = document.getElementById('delete-channel-confirm-btn');
const channelDeleteCancelBtn = document.getElementById('delete-channel-cancel-btn');

// 4. Initial Startup Logic
window.onload = () => {
    if (nickname !== "") {
        nameModal.style.display = "none";
        listenForMessages();
        loadSidebarChannels();
    }
};

// 5. Authorization Logic
joinBtn.onclick = () => {
    const val = nicknameInput.value.trim();
    if (val !== "") {
        nickname = val;
        localStorage.setItem("chat_nickname", nickname);
        nameModal.style.display = "none"; 
        listenForMessages();
        loadSidebarChannels();
    }
};

// 6. [FIXED] Message Listener with Auto-Delete (24 Hours)
function listenForMessages() {
    database.ref('messages/' + activeChannel).off(); 
    chatBox.innerHTML = ""; 
    lastSender = null; 

    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours calculation

    // Step 1: Purono message delete kora (Jader boyosh 24 ghontar beshi)
    database.ref('messages/' + activeChannel).once('value', (snapshot) => {
        snapshot.forEach((child) => {
            const msgData = child.val();
            if (now - msgData.time > oneDayInMs) {
                database.ref('messages/' + activeChannel + '/' + child.key).remove();
            }
        });
    });

    // Step 2: Shudhu fresh message-gulo load kora
    database.ref('messages/' + activeChannel).limitToLast(40).on('child_added', (snapshot) => {
        const data = snapshot.val();
        const key = snapshot.key;
        const isSameUser = (lastSender === data.user);
        
        window.requestAnimationFrame(() => {
            displayMessage(data, key, isSameUser);
            chatBox.scrollTop = chatBox.scrollHeight;
        });
        
        lastSender = data.user;
    });

    database.ref('messages/' + activeChannel).on('child_removed', (snapshot) => {
        const el = document.getElementById(snapshot.key);
        if(el) el.remove();
    });
}


// 7. [FIXED] Display Message Logic (Avatar Grouping Logic Added)
function displayMessage(data, key, isSameUser) {
    if (!data) return;
    const timeStr = new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.id = key; 
    
    messageDiv.oncontextmenu = (e) => {
        e.preventDefault();
        messageKeyToDelete = key;
        msgDeleteModal.style.display = 'flex';
    };

    // Avatar ar Name shudhu prothom message-e show hobe
    const avatarHTML = isSameUser ? "" : `<div class="avatar">${data.user ? data.user.charAt(0).toUpperCase() : "?"}</div>`;
    const nameHTML = isSameUser ? "" : `<span class="user-name">${data.user} <small>${timeStr}</small></span>`;
    
    // Grouped message hole margin ar padding adjust kora
    if(isSameUser) {
        messageDiv.style.marginTop = "-12px"; 
        messageDiv.style.paddingLeft = "42px"; // Avatar-er gap maintain korar jonno
    }

    messageDiv.innerHTML = `
        ${avatarHTML}
        <div class="msg-content">
            ${nameHTML}
            <p>${data.message}</p>
        </div>`;
    
    chatBox.appendChild(messageDiv);
}

// 8. Send Message Logic
sendBtn.onclick = () => {
    const msg = userInput.value.trim();
    if (msg !== "" && nickname !== "") {
        database.ref('messages/' + activeChannel).push({
            user: nickname, message: msg, time: Date.now()
        }).then(() => { userInput.value = ""; });
    }
};
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendBtn.click(); });

// 9. Channel Management Logic
document.querySelector('.add-server').onclick = () => { channelModal.style.display = 'flex'; };
document.getElementById('cancel-channel-btn').onclick = () => { 
    channelModal.style.display = 'none'; 
};

createChannelBtn.onclick = () => {
    const cName = newChannelNameInput.value.trim();
    const cIcon = newChannelIconInput.value.trim() || "#";
    if (cName !== "") {
        database.ref('channel_list').push({
            name: cName.toLowerCase().replace(/\s+/g, '-'),
            icon: cIcon
        }).then(() => {
            channelModal.style.display = 'none';
            newChannelNameInput.value = "";
            newChannelIconInput.value = "";
        });
    }
};

function loadSidebarChannels() {
    activeChannelTitle.innerText = activeChannel;
    database.ref('channel_list').on('value', (snapshot) => {
        const container = document.getElementById('dynamic-channels');
        container.innerHTML = ""; 
        createSidebarIcon(container, "general-chat", "L");
        snapshot.forEach((child) => {
            const data = child.val();
            createSidebarIcon(container, data.name, data.icon, child.key);
        });
    });
}

function createSidebarIcon(container, name, icon, key = null) {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'server-icon' + (activeChannel === name ? " active" : "");
    iconDiv.innerText = icon.toUpperCase();
    
    iconDiv.onclick = () => {
        activeChannel = name;
        activeChannelTitle.innerText = name;
        
        if (name !== "general-chat" && key) {
            headerDeleteBtn.style.display = 'block';
            headerDeleteBtn.onclick = () => {
                channelKeyToDelete = key;
                channelDeleteNameDisplay.innerText = `#${name}`;
                channelDeleteModal.style.display = 'flex';
            };
        } else {
            headerDeleteBtn.style.display = 'none';
        }

        listenForMessages();
        document.querySelectorAll('.server-icon').forEach(el => el.classList.remove('active'));
        iconDiv.classList.add('active');
    };
    container.appendChild(iconDiv);
}

// 10. Confirmation Modal Logic
msgDeleteConfirmBtn.onclick = () => {
    if(messageKeyToDelete) {
        database.ref('messages/' + activeChannel + '/' + messageKeyToDelete).remove();
        msgDeleteModal.style.display = 'none';
    }
};
msgDeleteCancelBtn.onclick = () => { msgDeleteModal.style.display = 'none'; };

channelDeleteConfirmBtn.onclick = () => {
    if(channelKeyToDelete) {
        database.ref('channel_list/' + channelKeyToDelete).remove();
        channelDeleteModal.style.display = 'none';
        activeChannel = "general-chat";
        listenForMessages();
    }
};
channelDeleteCancelBtn.onclick = () => { channelDeleteModal.style.display = 'none'; };

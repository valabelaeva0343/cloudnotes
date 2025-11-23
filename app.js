// === Настройки Supabase ===
const SUPABASE_URL = 'https://wtllwtogbbexispwhnsw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bGx3dG9nYmJleGlzcHdobnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjAyNDksImV4cCI6MjA3OTM5NjI0OX0.3HUWtlXbm3H8b--WmhUfUPBeVPGn1REEdsVqhjfGMU8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const newNoteBtn = document.getElementById('new-note-btn');
const notesList = document.getElementById('notes-list');
const titleInput = document.getElementById('note-title');
const contentInput = document.getElementById('note-content');
const saveStatus = document.getElementById('save-status');
const authMessage = document.getElementById('auth-message');
const deleteNoteBtn = document.getElementById('delete-note-btn');

let currentNoteId = null;
let saveTimer = null;

// === Инициализация ===
document.addEventListener('DOMContentLoaded', async () => {
  const sessionData = await supabase.auth.getSession();
  const session = sessionData.data.session;
  
  if (session) {
    showApp();
    loadNotes();
  } else {
    showAuth();
  }
});

// === Экраны ===
function showAuth() {
  authScreen.classList.add('active');
  appScreen.classList.remove('active');
  resetEditor();
}

function showApp() {
  authScreen.classList.remove('active');
  appScreen.classList.add('active');
  titleInput.disabled = false;
  contentInput.disabled = false;
}

function resetEditor() {
  titleInput.disabled = true;
  contentInput.disabled = true;
  deleteNoteBtn.disabled = true;
  titleInput.value = '';
  contentInput.value = '';
  saveStatus.textContent = 'Не сохранено';
  currentNoteId = null;
  notesList.innerHTML = '';
}

// === Авторизация ===
async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  authMessage.textContent = '';

  if (!email || !password) {
    authMessage.textContent = 'Заполните все поля';
    return;
  }

  const loginData = await supabase.auth.signInWithPassword({ email, password });
  const error = loginData.error;
  
  if (error) {
    authMessage.textContent = 'Ошибка входа: ' + (error.message || 'неверные данные');
    console.error('Login error:', error);
  } else {
    showApp();
    loadNotes();
  }
}

async function signup() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  authMessage.textContent = '';

  if (!email || password.length < 6) {
    authMessage.textContent = 'Email обязателен, пароль — от 6 символов';
    return;
  }

  const signupData = await supabase.auth.signUp({ email, password });
  const error = signupData.error;
  
  if (error) {
    authMessage.textContent = 'Ошибка регистрации: ' + (error.message || 'неизвестно');
    console.error('Signup error:', error);
  } else {
    authMessage.textContent = 'Аккаунт создан! Попробуйте войти.';
  }
}

// === Заметки ===
async function loadNotes() {
  const userData = await supabase.auth.getUser();
  const user = userData.data.user;
  const userError = userData.error;
  
  if (userError || !user) return;

  const notesData = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const data = notesData.data;
  const error = notesData.error;

  if (error) {
    console.error('Load notes error:', error);
    return;
  }

  notesList.innerHTML = '';
  data.forEach(note => {
    const li = document.createElement('li');
    li.textContent = note.title || 'Без названия';
    li.dataset.id = note.id;
    li.addEventListener('click', () => openNote(note));
    notesList.appendChild(li);
  });

  if (data.length > 0) {
    openNote(data[0]);
  } else {
    resetNoteEditor();
  }
}

function resetNoteEditor() {
  titleInput.value = '';
  contentInput.value = '';
  currentNoteId = null;
  deleteNoteBtn.disabled = true;
}

async function createNote() {
  const userData = await supabase.auth.getUser();
  const user = userData.data.user;
  const userError = userData.error;
  
  if (userError || !user) return;

  const insertData = await supabase
    .from('notes')
    .insert([{ user_id: user.id, title: '', content: '' }])
    .select()
    .single();

  const data = insertData.data;
  const error = insertData.error;

  if (error) {
    console.error('Create note error:', error);
    return;
  }

  openNote(data);
  loadNotes();
}

function openNote(note) {
  currentNoteId = note.id;
  titleInput.value = note.title || '';
  contentInput.value = note.content || '';
  saveStatus.textContent = 'Загружено';
  deleteNoteBtn.disabled = false;
  updateActiveNote(note.id);
}

function updateActiveNote(id) {
  document.querySelectorAll('#notes-list li').forEach(li => {
    li.classList.toggle('active', li.dataset.id === id);
  });
}

async function saveNote() {
  if (!currentNoteId) return;

  const updateData = await supabase
    .from('notes')
    .update({
      title: titleInput.value.trim(),
      content: contentInput.value
    })
    .eq('id', currentNoteId);

  const error = updateData.error;

  if (!error) {
    saveStatus.textContent = 'Сохранено в облаке';
  } else {
    saveStatus.textContent = 'Ошибка сохранения';
    console.error('Save error:', error);
  }
}

async function deleteNote() {
  if (!currentNoteId) return;

  if (!confirm('Вы уверены, что хотите удалить эту заметку?')) return;

  const deleteData = await supabase
    .from('notes')
    .delete()
    .eq('id', currentNoteId);

  const error = deleteData.error;

  if (error) {
    console.error('Delete error:', error);
    alert('Не удалось удалить заметку');
    return;
  }

  resetNoteEditor();
  loadNotes();
}

// === Обработчики ===
loginBtn.addEventListener('click', login);
signupBtn.addEventListener('click', signup);
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showAuth();
});
newNoteBtn.addEventListener('click', createNote);
deleteNoteBtn.addEventListener('click', deleteNote);
titleInput.addEventListener('input', () => scheduleSave());
contentInput.addEventListener('input', () => scheduleSave());

function scheduleSave() {
  saveStatus.textContent = 'Сохраняется...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNote, 1000);
}
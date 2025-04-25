// DOM Elements
const form = document.getElementById('todo-form');
const input = document.getElementById('task-input');
const prioritySelect = document.getElementById('priority-select');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filters button');
const searchInput = document.getElementById('search-input');
const emptyState = document.getElementById('empty-state');
const clearCompletedBtn = document.getElementById('clear-completed');
const clearAllBtn = document.getElementById('clear-all');
const themeToggle = document.querySelector('.theme-toggle');
const totalCount = document.getElementById('total-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const taskTemplate = document.getElementById('task-template');

// App State
let tasks = [];
let currentFilter = 'all';
let searchTerm = '';

// Initialize App
function initApp() {
  // Load tasks from local storage
  loadTasks();
  
  // Set up event listeners
  setupEventListeners();
  
  // Check user's preferred theme
  if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  // Render initial task list
  renderTasks();
  updateStats();
}

// Load tasks from localStorage
function loadTasks() {
  try {
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    // Ensure backward compatibility with old task structure
    tasks = tasks.map(task => {
      if (!task.id) {
        return { ...task, id: generateId(), createdAt: new Date().toISOString(), priority: task.priority || 'normal' };
      }
      return task;
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
    tasks = [];
    showToast('Error loading tasks', 'error');
  }
}

// Save tasks to localStorage
function saveTasks() {
  try {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving tasks:', error);
    showToast('Error saving tasks', 'error');
  }
}

// Set up event listeners
function setupEventListeners() {
  // Add task form submission
  form.addEventListener('submit', addTask);
  
  // Filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveFilter(btn.dataset.filter);
    });
  });
  
  // Search input
  searchInput.addEventListener('input', e => {
    searchTerm = e.target.value.trim().toLowerCase();
    renderTasks();
  });
  
  // Clear completed tasks
  clearCompletedBtn.addEventListener('click', clearCompletedTasks);
  
  // Clear all tasks
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all tasks?')) {
      clearAllTasks();
    }
  });
  
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
}

// Generate unique ID for tasks
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

// Add new task
function addTask(e) {
  e.preventDefault();
  const text = input.value.trim();
  const priority = prioritySelect.value;
  
  if (!text) return;
  
  const newTask = {
    id: generateId(),
    text,
    done: false,
    createdAt: new Date().toISOString(),
    priority
  };
  
  tasks.unshift(newTask); // Add to beginning of array for newest first
  input.value = '';
  prioritySelect.value = 'normal';
  
  saveTasks();
  renderTasks();
  updateStats();
  showToast('Task added successfully', 'success');
}

// Toggle task completion status
function toggleTaskDone(taskId) {
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    tasks[taskIndex].done = !tasks[taskIndex].done;
    saveTasks();
    renderTasks();
    updateStats();
    
    if (tasks[taskIndex].done) {
      showToast('Task completed!', 'success');
    }
  }
}

// Delete task
function deleteTask(taskId) {
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    const taskText = tasks[taskIndex].text;
    tasks.splice(taskIndex, 1);
    saveTasks();
    renderTasks();
    updateStats();
    showToast(`"${taskText.substring(0, 20)}${taskText.length > 20 ? '...' : ''}" deleted`, 'warning');
  }
}

// Edit task text
function editTask(taskId, newText) {
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1 && tasks[taskIndex].text !== newText) {
    tasks[taskIndex].text = newText;
    saveTasks();
    showToast('Task updated', 'success');
  }
}

// Cycle through priority levels
function cyclePriority(taskId) {
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    const priorities = ['normal', 'high', 'low'];
    const currentPriority = tasks[taskIndex].priority || 'normal';
    const currentIndex = priorities.indexOf(currentPriority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    
    tasks[taskIndex].priority = priorities[nextIndex];
    saveTasks();
    renderTasks();
    
    showToast(`Priority set to ${priorities[nextIndex]}`, 'success');
  }
}

// Clear completed tasks
function clearCompletedTasks() {
  const completedCount = tasks.filter(task => task.done).length;
  tasks = tasks.filter(task => !task.done);
  saveTasks();
  renderTasks();
  updateStats();
  showToast(`Cleared ${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'}`, 'success');
}

// Clear all tasks
function clearAllTasks() {
  tasks = [];
  saveTasks();
  renderTasks();
  updateStats();
  showToast('All tasks cleared', 'warning');
}

// Set active filter
function setActiveFilter(filter) {
  currentFilter = filter;
  
  // Update active button styling
  filterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  
  renderTasks();
}

// Filter tasks based on current filter and search term
function getFilteredTasks() {
  return tasks.filter(task => {
    // Filter by status/priority
    const matchesFilter = (
      currentFilter === 'all' || 
      (currentFilter === 'active' && !task.done) || 
      (currentFilter === 'done' && task.done) ||
      (currentFilter === 'high' && task.priority === 'high')
    );
    
    // Filter by search term
    const matchesSearch = !searchTerm || 
      task.text.toLowerCase().includes(searchTerm);
    
    return matchesFilter && matchesSearch;
  });
}

// Render tasks to DOM
function renderTasks() {
  const filteredTasks = getFilteredTasks();
  taskList.innerHTML = '';
  
  if (filteredTasks.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    
    filteredTasks.forEach(task => {
      const taskElement = document.importNode(taskTemplate.content, true);
      const listItem = taskElement.querySelector('.task-item');
      const checkbox = taskElement.querySelector('.task-checkbox');
      const taskText = taskElement.querySelector('.task-text');
      const taskDate = taskElement.querySelector('.task-date');
      const priorityBtn = taskElement.querySelector('.priority-btn');
      const editBtn = taskElement.querySelector('.edit-btn');
      const deleteBtn = taskElement.querySelector('.delete-btn');
      
      // Set task state and content
      if (task.done) listItem.classList.add('done');
      if (task.priority === 'high') listItem.classList.add('high-priority');
      if (task.priority === 'low') listItem.classList.add('low-priority');
      
      checkbox.checked = task.done;
      taskText.textContent = task.text;
      taskDate.textContent = formatDate(task.createdAt);
      
      // Set priority button icon according to priority
      if (task.priority === 'high') {
        priorityBtn.innerHTML = '<i class="fas fa-flag" style="color: var(--danger-color);"></i>';
      } else if (task.priority === 'low') {
        priorityBtn.innerHTML = '<i class="fas fa-flag" style="color: var(--warning-color);"></i>';
      }
      
      // Set up event listeners for task actions
      checkbox.addEventListener('change', () => toggleTaskDone(task.id));
      
      taskText.addEventListener('blur', () => {
        editTask(task.id, taskText.textContent);
      });
      
      taskText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          taskText.blur();
        }
      });
      
      priorityBtn.addEventListener('click', () => cyclePriority(task.id));
      editBtn.addEventListener('click', () => taskText.focus());
      deleteBtn.addEventListener('click', () => deleteTask(task.id));
      
      taskList.appendChild(taskElement);
    });
  }
}

// Update task counts
function updateStats() {
  const totalTaskCount = tasks.length;
  const activeTaskCount = tasks.filter(task => !task.done).length;
  const completedTaskCount = totalTaskCount - activeTaskCount;
  
  totalCount.textContent = totalTaskCount;
  activeCount.textContent = activeTaskCount;
  completedCount.textContent = completedTaskCount;
}

// Toggle dark/light theme
function toggleTheme() {
  const isDarkTheme = document.body.classList.toggle('dark-theme');
  localStorage.setItem('darkTheme', isDarkTheme);
  
  themeToggle.innerHTML = isDarkTheme ? 
    '<i class="fas fa-sun"></i>' : 
    '<i class="fas fa-moon"></i>';
  
  showToast(`${isDarkTheme ? 'Dark' : 'Light'} theme activated`, 'success');
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast';
  toast.classList.add(type);
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', initApp);
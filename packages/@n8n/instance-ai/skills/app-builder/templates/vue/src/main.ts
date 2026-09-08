import './style.css';
import './theme-overrides.css';
import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';
import { THEME_MODE } from './theme-mode';

// theme-overrides.css imports after style.css so its :root block wins by
// cascade order regardless of which base palette (light or dark) is active.
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (THEME_MODE === 'dark' || (THEME_MODE === 'system' && prefersDark)) {
	document.documentElement.classList.add('dark');
}

if (import.meta.env.DEV) void import('./dev-bridge');

createApp(App).use(router).mount('#app');

import { createApp } from 'vue';

import App from './App.vue';
import { router } from './router';
import { THEME_MODE } from './theme-mode';

// Stylesheets are <link>ed from index.html (theme-overrides.css after style.css so
// its :root block wins by cascade order) so the dev server ships them before the
// first paint instead of injecting them from JS.
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (THEME_MODE === 'dark' || (THEME_MODE === 'system' && prefersDark)) {
	document.documentElement.classList.add('dark');
}

if (import.meta.env.DEV || import.meta.env.VITE_N8N_PREVIEW) void import('./dev-bridge');

createApp(App).use(router).mount('#app');

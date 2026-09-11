import { createRouter, createWebHistory } from 'vue-router';

import Home from './pages/Home.vue';

// BASE_URL is Vite's `base`, which the n8n build sets from APP_BASE (/apps/<namespace>/).
export const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [{ path: '/', component: Home }],
});

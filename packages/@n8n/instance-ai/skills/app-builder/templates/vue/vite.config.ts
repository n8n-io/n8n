import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// n8n serves the built app at /apps/<namespace>/ and passes that path as APP_BASE.
export default defineConfig({
	base: process.env.APP_BASE ?? '/',
	plugins: [vue(), tailwindcss()],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
});

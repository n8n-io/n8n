import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// n8n serves the built app at /apps/<namespace>/ and passes that path as APP_BASE.
export default defineConfig({
	base: process.env.APP_BASE ?? '/',
	plugins: [vue()],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	// The design system ships as one chunk; the default 500 kB warning is noise here.
	build: { chunkSizeWarningLimit: 2000 },
});

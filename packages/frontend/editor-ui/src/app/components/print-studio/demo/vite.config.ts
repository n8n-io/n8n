import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	root: fileURLToPath(new URL('.', import.meta.url)),
	plugins: [vue()],
	server: { host: '127.0.0.1', port: 5182, strictPort: true },
	build: { outDir: '/private/tmp/n8n-print-studio-build', emptyOutDir: true },
});

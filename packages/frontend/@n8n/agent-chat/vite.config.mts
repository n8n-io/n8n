import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// One self-contained IIFE (Vue bundled) plus one CSS file. The n8n instance serves both.
export default defineConfig({
	plugins: [vue()],
	define: { 'process.env.NODE_ENV': JSON.stringify('production') },
	build: {
		lib: {
			entry: resolve(import.meta.dirname, 'src/main.ts'),
			name: 'N8nAgentChat',
			formats: ['iife'],
			fileName: () => 'agent-chat.js',
			cssFileName: 'agent-chat',
		},
	},
});

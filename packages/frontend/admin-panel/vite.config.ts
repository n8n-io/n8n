import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
	base: '/admin/',
	server: {
		port: 5679,
		proxy: {
			'/api': {
				target: 'http://localhost:5678',
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: '../../cli/dist/public/admin',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
			},
		},
	},
});

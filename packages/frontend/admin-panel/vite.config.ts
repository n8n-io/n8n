import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import icons from 'unplugin-icons/vite';

const packagesDir = resolve(__dirname, '..', '..');

export default defineConfig({
	plugins: [vue(), icons({ compiler: 'vue3' })],
	resolve: {
		alias: [
			{ find: '@', replacement: resolve(__dirname, './src') },
			{
				find: /^@n8n\/design-system(.+)$/,
				replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src$1'),
			},
		],
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
		cssMinify: false,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
			},
		},
	},
});

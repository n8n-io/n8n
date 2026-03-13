import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// In Docker, VITE_API_URL=http://api:3100; locally, defaults to localhost
const apiTarget = process.env.VITE_API_URL ?? 'http://localhost:3100';

export default defineConfig({
	plugins: [vue()],
	root: resolve(__dirname),
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
	server: {
		port: 3200,
		host: '0.0.0.0',
		proxy: {
			'/api': apiTarget,
			'/webhook': apiTarget,
		},
	},
	build: {
		outDir: resolve(__dirname, '../../dist/web'),
		emptyOutDir: true,
	},
});

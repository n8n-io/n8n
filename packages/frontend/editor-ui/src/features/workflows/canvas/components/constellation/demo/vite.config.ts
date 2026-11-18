import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
	root,
	plugins: [vue()],
	cacheDir: `${root}/.vite`,
	resolve: {
		dedupe: ['vue'],
	},
	server: {
		host: '127.0.0.1',
		port: 5181,
		strictPort: true,
		fs: { allow: [fileURLToPath(new URL('../../../../../../../../../..', import.meta.url))] },
	},
	build: { outDir: `${root}/dist` },
});

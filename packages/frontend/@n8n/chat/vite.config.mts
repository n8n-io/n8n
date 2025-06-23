import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'path';
import { renameSync } from 'fs';
import vue from '@vitejs/plugin-vue';
import icons from 'unplugin-icons/vite';
import dts from 'vite-plugin-dts';
import { vitestConfig } from '@n8n/vitest-config/frontend';

const includeVue = process.env.INCLUDE_VUE === 'true';
const srcPath = resolve(__dirname, 'src');

// https://vitejs.dev/config/
export default mergeConfig(
	defineConfig({
		plugins: [
			vue(),
			icons({
				compiler: 'vue3',
				autoInstall: true,
			}),
			dts(),
			{
				name: 'rename-css-file',
				closeBundle() {
					// The chat.css is automatically named based on vite.config.ts library name.
					// ChatTrigger Node requires https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css
					// As such for backwards compatibility, we need to maintain the same name file
					const cssPath = resolve(__dirname, 'dist', 'chat.css');
					const newCssPath = resolve(__dirname, 'dist', 'style.css');
					try {
						renameSync(cssPath, newCssPath);
					} catch (error) {
						console.error('Failed to rename chat.css file:', error);
					}
				},
			},
		],
		resolve: {
			alias: {
				'@': srcPath,
				'@n8n/chat': srcPath,
			},
		},
		define: {
			'process.env.NODE_ENV': process.env.NODE_ENV ? `"${process.env.NODE_ENV}"` : '"development"',
		},
		build: {
			emptyOutDir: !includeVue,
			lib: {
				entry: resolve(__dirname, 'src', 'index.ts'),
				name: 'N8nChat',
				fileName: (format) => (includeVue ? `chat.bundle.${format}.js` : `chat.${format}.js`),
			},
			rollupOptions: {
				// make sure to externalize deps that shouldn't be bundled
				// into your library
				external: includeVue ? [] : ['vue'],
				output: {
					exports: 'named',
					// Provide global variables to use in the UMD build
					// for externalized deps
					globals: includeVue
						? {}
						: {
								vue: 'Vue',
							},
				},
			},
		},
	}),
	vitestConfig,
);

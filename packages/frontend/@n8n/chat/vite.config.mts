import { defineConfig, mergeConfig, PluginOption } from 'vite';
import { resolve } from 'path';
import { renameSync, writeFileSync, readFileSync } from 'fs';
import vue from '@vitejs/plugin-vue';
import icons from 'unplugin-icons/vite';
import dts from 'vite-plugin-dts';
import { vitestConfig } from '@n8n/vitest-config/frontend';
import pkg from './package.json';
import iconsResolver from 'unplugin-icons/resolver';
import components from 'unplugin-vue-components/vite';

const includeVue = process.env.INCLUDE_VUE === 'true';
const srcPath = resolve(__dirname, 'src');
const packagesDir = resolve(__dirname, '..', '..', '..');

const banner = `/*! Package version @n8n/chat@${pkg.version} */`;

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
			components({
				dts: './src/components.d.ts',
				resolvers: [
					(componentName) => {
						if (componentName.startsWith('N8n'))
							return { name: componentName, from: '@n8n/design-system' };
					},
					iconsResolver({
						prefix: 'icon',
					}),
				],
			}),
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
			{
				name: 'inject-build-version',
				closeBundle() {
					const cssPath = resolve(__dirname, 'dist', 'style.css');
					try {
						const cssContent = readFileSync(cssPath, 'utf-8');
						const updatedCssContent = banner + '\n' + cssContent;
						writeFileSync(cssPath, updatedCssContent, 'utf-8');
					} catch (error) {
						console.error('Failed to inject build version into CSS file:', error);
					}
				},
			},
		],
		resolve: {
			alias: [
				{
					find: '@',
					replacement: srcPath,
				},
				{
					find: '@n8n/chat',
					replacement: srcPath,
				},
				{
					find: /^@n8n\/chat(.+)$/,
					replacement: srcPath + '$1',
				},
				{
					find: /^@n8n\/design-system(.+)$/,
					replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src$1'),
				},
			],
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
					// inject banner on top of all JS files
					banner,
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

import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import icons from 'unplugin-icons/vite';
import dts from 'vite-plugin-dts';
import { vitestConfig } from '@n8n/vitest-config/frontend';
import iconsResolver from 'unplugin-icons/resolver';
import components from 'unplugin-vue-components/vite';

const includeVue = process.env.INCLUDE_VUE === 'true';
const srcPath = resolve(__dirname, 'src');
const packagesDir = resolve(__dirname, '..', '..', '..');

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

import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import components from 'unplugin-vue-components/vite';
import icons from 'unplugin-icons/vite';
import iconsResolver from 'unplugin-icons/resolver';
import { vitestConfig } from '@n8n/vitest-config/frontend';

const packagesDir = resolve(__dirname, '..', '..', '..');

export default mergeConfig(
	defineConfig({
		plugins: [
			vue(),
			icons({
				compiler: 'vue3',
				autoInstall: true,
			}),
			components({
				dirs: [],
				dts: false,
				resolvers: [
					iconsResolver({
						prefix: 'icon',
					}),
				],
			}),
		],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'@n8n/design-system': resolve(__dirname, 'src'),
				'@n8n/composables(.*)': resolve(packagesDir, 'frontend', '@n8n', 'composables', 'src$1'),
				'@n8n/utils(.*)': resolve(packagesDir, '@n8n', 'utils', 'src$1'),
				lodash: 'lodash-es',
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, 'src', 'index.ts'),
				name: 'N8nDesignSystem',
				fileName: (format) => `n8n-design-system.${format}.js`,
			},
			rollupOptions: {
				// make sure to externalize deps that shouldn't be bundled
				// into your library
				external: ['vue'],
				output: {
					exports: 'named',
					// Provide global variables to use in the UMD build
					// for externalized deps
					globals: {
						vue: 'Vue',
					},
				},
			},
		},
	}),
	vitestConfig,
);

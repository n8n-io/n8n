import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { type UserConfig } from 'vitest';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import components from 'unplugin-vue-components/vite';
import icons from 'unplugin-icons/vite';
import iconsResolver from 'unplugin-icons/resolver';

export const vitestConfig = defineVitestConfig({
	test: {
		silent: true,
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/__tests__/setup.ts'],
		...(process.env.COVERAGE_ENABLED === 'true'
			? {
					coverage: {
						enabled: true,
						provider: 'v8',
						reporter: process.env.CI === 'true' ? 'cobertura' : 'text-summary',
						all: true,
					},
				}
			: {}),
		css: {
			modules: {
				classNameStrategy: 'non-scoped',
			},
		},
	},
}) as UserConfig;

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
						prefix: 'icon'
					})
				]
			}),
		],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'n8n-design-system': resolve(__dirname, 'src'),
				lodash: 'lodash-es',
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, 'src', 'main.ts'),
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

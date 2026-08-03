import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import icons from 'unplugin-icons/vite';
import dts from 'vite-plugin-dts';
import { vitestConfig } from '@n8n/vitest-config/frontend';
import svgLoader from 'vite-svg-loader';
import { lucideIconsPlugin } from './src/icons/lucide/vite';

const packagesDir = resolve(__dirname, '..', '..', '..');

export default mergeConfig(
	defineConfig({
		plugins: [
			vue(),
			lucideIconsPlugin(),
			svgLoader({
				svgoConfig: {
					plugins: [
						{
							name: 'preset-default',
							params: {
								overrides: {
									// disable a default plugin
									cleanupIds: false,
									// preserve viewBox for scalability
									removeViewBox: false,
								},
							},
						},
					],
				},
			}),
			icons({
				compiler: 'vue3',
				autoInstall: true,
			}),
			// The plugin drives the emit, not a bare `vue-tsc -p` invocation. Invoked
			// directly, vue-tsc exits 0 and silently writes nothing for any component
			// whose inferred template context reaches a type it cannot name through
			// pnpm's hashed paths — vue-router's global `ComponentCustomProperties`
			// augmentation alone accounted for 54 skipped components (TS2883).
			dts({
				// `tsconfig.build.json` rather than `tsconfig.json`: the latter maps the
				// sibling `@n8n/*` packages to their `src`, which pulls files outside
				// `rootDir` into the program (TS6059) and points the declarations at
				// another package's sources instead of its published types.
				tsconfigPath: resolve(__dirname, 'tsconfig.build.json'),
				// Per-file declarations, not a rollup: api-extractor cannot follow `.vue`
				// module specifiers and leaves the imports dangling. Rejected in ADR-0002.
				rollupTypes: false,
				entryRoot: resolve(__dirname, 'src'),
			}),
		],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'@n8n/design-system': resolve(__dirname, 'src'),
				'@n8n/composables(.*)': resolve(packagesDir, 'frontend', '@n8n', 'composables', 'src$1'),
				'@n8n/frontend-utils(.*)': resolve(
					packagesDir,
					'frontend',
					'@n8n',
					'frontend-utils',
					'src$1',
				),
				'@n8n/utils(.*)': resolve(packagesDir, '@n8n', 'utils', 'src$1'),
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

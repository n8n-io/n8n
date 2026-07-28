import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import icons from 'unplugin-icons/vite';
import dts from 'vite-plugin-dts';
import { vitestConfig } from '@n8n/vitest-config/frontend';
import svgLoader from 'vite-svg-loader';
import { lucideIconsPlugin } from './src/icons/lucide/vite';
import { dependencies, peerDependencies } from './package.json';

const packagesDir = resolve(__dirname, '..', '..', '..');

/**
 * Anything we declare as a runtime dependency stays an `import` in the output.
 * Bundling them would ship a second copy of element-plus/tiptap/vue to every
 * consumer that already uses them. Subpaths (`@tiptap/core/x`) match by prefix.
 */
const externalNames = [...Object.keys(dependencies), ...Object.keys(peerDependencies)];
const external = (id: string) =>
	externalNames.some((name) => id === name || id.startsWith(`${name}/`));

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
			dts({
				tsconfigPath: resolve(__dirname, 'tsconfig.build.json'),
				// Per-file declarations, deliberately. Driving the emit through this
				// plugin instead of a bare `vue-tsc` is what fixes the TS2883 silent
				// skips (vue-router's global `ComponentCustomProperties` augmentation
				// and `@vue/shared`'s `LooseRequired` not being nameable through
				// pnpm's hashed paths) — the flattening does not.
				//
				// Flattening was tried and rejected: api-extractor cannot follow `.vue`
				// module specifiers, so it leaves dangling relative imports such as
				// `from './Select.vue'` and degrades those components to `any`. Keeping
				// per-file declarations also preserves types on deep paths.
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
			// All SFC styles land in one file so consumers have a single, stable
			// `@n8n/design-system/style.css` to import.
			cssCodeSplit: false,
			// UMD is dropped: with ~40 externals a UMD bundle would need a `globals`
			// entry per dependency, and every consumer of a Vue SFC library uses a
			// bundler anyway. ESM only, matching `"type": "module"`.
			// A single entry, so the declarations have a single root and the `exports`
			// allowlist stays small. The lucide loader is re-exported from
			// `src/index.ts` rather than being its own entry: that keeps the 16 icon
			// buckets baked into dist as lazy chunks (they are dynamic imports)
			// without a second entry point to service.
			lib: {
				entry: { index: resolve(__dirname, 'src', 'index.ts') },
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					// One output file per source module. This is what makes the package
					// tree-shakeable without hand-maintaining ~150 entry points, and it
					// keeps the lucide icon buckets as separate lazy chunks.
					preserveModules: true,
					preserveModulesRoot: resolve(__dirname, 'src'),
					entryFileNames: '[name].js',
					chunkFileNames: 'chunks/[name]-[hash].js',
					assetFileNames: (asset) =>
						// cssCodeSplit is off, so there is exactly one CSS asset.
						asset.names?.some((name) => name.endsWith('.css'))
							? 'style.css'
							: 'assets/[name]-[hash][extname]',
					exports: 'named',
				},
			},
		},
	}),
	vitestConfig,
);

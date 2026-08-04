import vue from '@vitejs/plugin-vue';
import { cpSync } from 'node:fs';
import { resolve } from 'path';
import { build, defineConfig, mergeConfig, type InlineConfig, type Plugin } from 'vite';
import icons from 'unplugin-icons/vite';
import dts from 'vite-plugin-dts';
import { vitestConfig } from '@n8n/vitest-config/frontend';
import svgLoader from 'vite-svg-loader';
import { lucideIconsPlugin } from './src/icons/lucide/vite';

const packagesDir = resolve(__dirname, '..', '..', '..');
const srcDir = resolve(__dirname, 'src');
const distDir = resolve(__dirname, 'dist');

/** Emit stylesheets at the dist root, everything else under `assets/`. */
const assetFileNames = (name: string) => (asset: { names?: string[] }) =>
	asset.names?.[0]?.endsWith('.css') ? name : 'assets/[name][extname]';

/**
 * Ship the SCSS sources alongside the compiled CSS so consumers with a sass
 * toolchain can `@use` our mixins and token maps from their own stylesheets.
 *
 * The copy keeps the `css/` folder name on purpose: internal code already writes
 * `@n8n/design-system/css/mixins/motion` (49 call sites, resolved through an
 * alias to `src/css/`), so `dist/css` is the target that lets those specifiers
 * read identically inside and outside the monorepo.
 *
 * `dist/css/` sits two levels below the package root, exactly like `src/css/`,
 * so the `url('../../assets/fonts/…')` in `fonts.scss` and `icon.scss` keeps
 * resolving without rewriting a single path.
 */
function copyScssSources(): Plugin {
	return {
		name: 'n8n:copy-scss-sources',
		closeBundle() {
			cpSync(resolve(srcDir, 'css'), resolve(distDir, 'css'), {
				recursive: true,
				// The stylesheets ship; the test that asserts on their selector order does not.
				filter: (source) => !source.endsWith('.test.ts'),
			});
			cpSync(resolve(srcDir, 'utils.scss'), resolve(distDir, 'css', 'utils.scss'));
		},
	};
}

/**
 * Second pass over `dist`, run from `builder.buildApp` below.
 *
 * `src/css/index.scss` is the theme every consumer needs — design tokens,
 * `@font-face` rules, the reset and the element-plus overrides — and no Vue SFC
 * imports it, so the library pass never emits it. Without it the shipped
 * component CSS references `var(--…)` tokens that are never defined.
 *
 * It cannot ride the library pass: `build.lib.entry` takes JS modules, and a
 * second entry would force code splitting, which the UMD output cannot do. So it
 * gets its own pass — in this file, off the same `vite build`.
 */
const themeBuild: InlineConfig = {
	// This file is the config; loading it again here would recurse.
	configFile: false,
	root: __dirname,
	plugins: [copyScssSources()],
	// Font `url()`s emit relative to the stylesheet rather than Vite's default
	// absolute `/assets/…`, which 404s wherever the app is not served from the web
	// root. Scoped to this pass — the library pass emits no assets at all.
	base: './',
	build: {
		// The library pass owns dist; this one only adds to it.
		emptyOutDir: false,
		outDir: 'dist',
		cssCodeSplit: true,
		rollupOptions: {
			input: { theme: resolve(srcDir, 'css', 'index.scss') },
			output: { assetFileNames: assetFileNames('[name][extname]') },
		},
	},
};

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
			// The plugin drives the emit rather than a bare `vue-tsc -p`: invoked
			// directly, vue-tsc exits 0 and silently writes nothing for a component
			// whose template context reaches a type it cannot name (54 of them during
			// the spike). Acceptance counts emitted files, not the exit code.
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
					assetFileNames: assetFileNames('style.css'),
				},
			},
		},
		builder: {
			// Library first — it owns dist and empties it. Theme second, additive.
			buildApp: async (builder) => {
				await builder.build(builder.environments.client);
				await build(themeBuild);
			},
		},
	}),
	vitestConfig,
);

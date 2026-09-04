import vue from '@vitejs/plugin-vue';
import { cpSync, readFileSync } from 'node:fs';
import { resolve } from 'path';
import { build, defineConfig, mergeConfig, type InlineConfig, type Plugin } from 'vite';
import icons from 'unplugin-icons/vite';
import dts from 'vite-plugin-dts';
import { vitestConfig } from '@n8n/vitest-config/frontend';
import svgLoader from 'vite-svg-loader';
import { lucideIconsPlugin } from './src/icons/lucide/vite';

const srcDir = resolve(__dirname, 'src');
const distDir = resolve(__dirname, 'dist');

// Only the published package reads these declarations, and the emit is ~10s of a ~14s build.
// Every consumer in this repo reads `src` instead. `RELEASE` marks the paths that ship `dist`.
const emitDeclarations = !!process.env.RELEASE;

const manifest = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
};

/**
 * Everything the manifest declares stays out of the bundle — inlining a
 * dependency ships a second copy the consumer cannot dedupe (two element-plus
 * instances, two Vue reactivity contexts).
 *
 * Read from the manifest rather than hand-listed: the previous `['vue']`
 * silently inlined every dependency added to the package after it was written.
 *
 * Sub-path imports (`@n8n/utils/event-bus`) belong to the package owning the
 * prefix, so match `name` and `name/…` but not `name-something-else`. Nothing
 * declares the build-time virtuals (`virtual:lucide-icons`, `~icons/…`), so
 * they stay inlined — which is what makes `dist` work without our Vite plugin.
 */
const externalPackages = [
	...Object.keys(manifest.dependencies ?? {}),
	...Object.keys(manifest.peerDependencies ?? {}),
];
const isExternal = (id: string) =>
	externalPackages.some((name) => id === name || id.startsWith(`${name}/`));

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
			...(emitDeclarations
				? [
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
					]
				: []),
		],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'@n8n/design-system': resolve(__dirname, 'src'),
				// No entries for the sibling `@n8n/composables`, `@n8n/frontend-utils` and
				// `@n8n/utils`: they publish their own `dist` + `exports`, so they resolve
				// through node and externalise with everything else.
			},
		},
		build: {
			lib: {
				entry: {
					index: resolve(srcDir, 'index.ts'),
					// Second entry so the icon bodies are compiled into `dist` here, once,
					// instead of every consumer having to register `lucideIconsPlugin()` to
					// resolve `virtual:lucide-icons`.
					//
					// It stays a separate entry — never re-exported from `src/index.ts` —
					// because a barrel export would make this opt-in capability mandatory
					// for everyone who imports the barrel, including consumers that alias
					// this package to source and register no plugin.
					'icons/lucide/index': resolve(srcDir, 'icons', 'lucide', 'index.ts'),
					// Third entry for the same reason: `N8nPlugin` only registers the
					// directives, so a consumer that wants them should not have to pull
					// the component barrel. It stays on `src/index.ts` too — the entry is
					// an extra door, not a move.
					plugin: resolve(srcDir, 'plugin.ts'),
				},
				// ES only. UMD supports neither multiple entries nor code splitting, and
				// both are requirements here — the icon buckets have to stay lazy chunks.
				// Nothing consumed the UMD output.
				formats: ['es'],
				// Sits the emitted JS next to the declarations `dts` writes for the same
				// module, so each entry is one `dist/<path>/index.{js,d.ts}` pair.
				fileName: (_format, entryName) => `${entryName}.js`,
			},
			rollupOptions: {
				external: isExternal,
				output: {
					exports: 'named',
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

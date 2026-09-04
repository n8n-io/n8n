// Each import in this file must resolve with no build step.
// Put an import that needs a `dist` in `vitest.config.mts`.
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, type UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgLoader from 'vite-svg-loader';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { codecovVitePlugin } from '@codecov/vite-plugin';

import icons from 'unplugin-icons/vite';
import { lucideIconsPlugin } from '../@n8n/design-system/src/icons/lucide/vite';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import legacy from '@vitejs/plugin-legacy';
import browserslist from 'browserslist';
import { isLocaleFile, sendLocaleUpdate } from './vite/i18n-locales-hmr-helpers';
import { nodePopularityPlugin } from './vite/vite-plugin-node-popularity.mjs';
import { editorUiAliases } from './vite/aliases.mjs';
import { DEFAULT_BACKEND_PORT, devServerPlugin, readDevPort } from './vite/dev-ports.mjs';
// Imported from source, not from `@n8n/constants`: this file must resolve with no build step.
import { HTML_NONCE_PLACEHOLDER } from '../../@n8n/constants/src/csp';

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

const { NODE_ENV } = process.env;

// Only reachable through the dev server (see the `ctx.server` guard below),
// which `devServerPlugin` has already validated by the time it runs.
const devBackendPort = readDevPort(process.env, 'N8N_PORT', DEFAULT_BACKEND_PORT);

const browsers = browserslist.loadConfig({ path: process.cwd() });

const packagesDir = resolve(__dirname, '..', '..');

// zod is the only single-instance-sensitive library the frontend bundles; dedupe it so
// Vite resolves it to a single copy. The other curated libs are backend-only.
const singleInstanceDedupe = ['zod'];

const alias = editorUiAliases(__dirname, packagesDir);

const { RELEASE: release, SENTRY_AUTH_TOKEN: sentryAuthToken } = process.env;

const plugins: UserConfig['plugins'] = [
	devServerPlugin(process.env),
	nodePopularityPlugin(),
	lucideIconsPlugin(),
	icons({
		compiler: 'vue3',
		autoInstall: NODE_ENV === 'development',
	}),
	viteStaticCopy({
		targets: [
			{
				src: 'node_modules/web-tree-sitter/tree-sitter.wasm',
				dest: '.',
				rename: { stripBase: true },
			},
			{
				src: 'node_modules/curlconverter/dist/tree-sitter-bash.wasm',
				dest: '.',
				rename: { stripBase: true },
			},
			// wa-sqlite WASM files for OPFS database support (no cross-origin isolation needed)
			{
				src: 'node_modules/wa-sqlite/dist/wa-sqlite.wasm',
				dest: 'assets',
			},
			{
				src: 'node_modules/wa-sqlite/dist/wa-sqlite-async.wasm',
				dest: 'assets',
			},
		],
	}),
	vue(),
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
	...(release
		? [
				legacy({
					modernTargets: browsers,
				}),
			]
		: []),
	{
		name: 'Insert config script',
		transformIndexHtml: (html, ctx) => {
			// Skip config tags when using Vite dev server. Otherwise the BE
			// will replace it with the actual config script in cli/src/commands/start.ts.
			return ctx.server
				? html
						.replace('%CONFIG_TAGS%', '')
						.replaceAll('/{{BASE_PATH}}', `//localhost:${devBackendPort}`)
						.replaceAll('/{{REST_ENDPOINT}}', '/rest')
				: html;
		},
	},
	// For sanitize-html
	// nodePolyfills({
	// 	include: ['fs', 'path', 'url', 'util', 'timers'],
	// }),
	{
		name: 'i18n-locales-hmr',
		configureServer(server) {
			const localesDir = resolve(packagesDir, 'frontend', '@n8n', 'i18n', 'src', 'locales');
			server.watcher.add(localesDir);

			// Only emit for add/unlink; change events are handled in handleHotUpdate
			server.watcher.on('all', (event, file) => {
				if ((event === 'add' || event === 'unlink') && isLocaleFile(file)) {
					sendLocaleUpdate(server, file);
				}
			});
		},
		handleHotUpdate(ctx) {
			const { file, server } = ctx;
			if (!isLocaleFile(file)) return;
			sendLocaleUpdate(server, file);
			// Swallow default HMR for this file to prevent full page reloads
			return [];
		},
	},
	...(release
		? [
				sentryVitePlugin({
					org: 'n8nio',
					project: 'instance-frontend',
					authToken: sentryAuthToken,
					// Stop the deletion hook if the Sentry upload fails.
					errorHandler: (error) => {
						throw error;
					},
					telemetry: false,
					release: {
						name: `n8n@${release}`,
					},
					sourcemaps: {
						// Sentry keeps these maps, so the image does not need them (156MB).
						// Keep the maps if upload credentials are not available.
						filesToDeleteAfterUpload: sentryAuthToken ? ['./dist/**/*.map'] : undefined,
					},
				}),
			]
		: []),
	// Only run on non-release builds to prevent double upload from @vitejs/plugin-legacy
	...(process.env.CODECOV_TOKEN && !release
		? [
				codecovVitePlugin({
					enableBundleAnalysis: true,
					bundleName: 'editor-ui',
					uploadToken: process.env.CODECOV_TOKEN,
					debug: true,
				}),
			]
		: []),
];

const target = browserslistToEsbuild(browsers);

export default defineConfig({
	define: {
		// This causes test to fail but is required for actually running it
		// ...(NODE_ENV !== 'test' ? { 'global': 'globalThis' } : {}),
		...(NODE_ENV === 'development' ? { 'process.env': {} } : {}),
		BASE_PATH: `'${publicPath}'`,
	},
	plugins,
	// Marks every script, style and stylesheet link Vite emits, so the backend can swap in
	// the request's nonce when it serves the page. Vite stamps these last, after plugins
	// like `@vitejs/plugin-legacy` have appended their own tags, which a plugin of ours
	// could not reach.
	html: { cspNonce: HTML_NONCE_PLACEHOLDER },
	resolve: { alias, dedupe: singleInstanceDedupe },
	base: publicPath,
	envPrefix: ['VUE', 'N8N_ENV_FEAT'],
	css: {
		preprocessorMaxWorkers: 2,
		preprocessorOptions: {
			scss: {
				additionalData: [
					'',
					'@use "@/app/css/_variables.scss" as *;',
					'@use "@n8n/design-system/css/mixins" as mixins;',
				].join('\n'),
			},
		},
	},
	build: {
		minify: !!release,
		// Coverage builds emit INLINE maps so browser V8 coverage carries the
		// map in the script source and monocart resolves offsets back to src.
		// 'hidden' writes the maps but omits the sourceMappingURL comment.
		// Deleted maps then cause no 404 in devtools.
		sourcemap: process.env.BUILD_WITH_COVERAGE === 'true' ? 'inline' : release ? 'hidden' : false,
		target,
		cssTarget: target,
	},
	optimizeDeps: {
		exclude: ['wa-sqlite'],
		rolldownOptions: {},
	},
	worker: {
		format: 'es',
	},
});

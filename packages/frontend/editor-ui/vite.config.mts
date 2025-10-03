import vue from '@vitejs/plugin-vue';
import { posix as pathPosix, resolve, sep as pathSep } from 'path';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgLoader from 'vite-svg-loader';
import istanbul from 'vite-plugin-istanbul';
import { sentryVitePlugin } from '@sentry/vite-plugin';

import { vitestConfig } from '@n8n/vitest-config/frontend';
import icons from 'unplugin-icons/vite';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import legacy from '@vitejs/plugin-legacy';
import browserslist from 'browserslist';
import { isLocaleFile, sendLocaleUpdate } from './vite/i18n-locales-hmr-helpers';
import { nodePopularityPlugin } from './vite/vite-plugin-node-popularity.mjs';

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

const { NODE_ENV } = process.env;

const browsers = browserslist.loadConfig({ path: process.cwd() });

const packagesDir = resolve(__dirname, '..', '..');

const alias = [
	{ find: '@', replacement: resolve(__dirname, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
	// Ensure bare imports resolve to sources (not dist)
	{ find: '@n8n/i18n', replacement: resolve(packagesDir, 'frontend', '@n8n', 'i18n', 'src') },
	{
		find: /^@n8n\/chat(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'chat', 'src$1'),
	},
	{
		find: /^@n8n\/api-requests(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'api-requests', 'src$1'),
	},
	{
		find: /^@n8n\/composables(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'composables', 'src$1'),
	},
	{
		find: /^@n8n\/constants(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'constants', 'src$1'),
	},
	{
		find: /^@n8n\/design-system(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src$1'),
	},
	{
		find: /^@n8n\/i18n(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'i18n', 'src$1'),
	},
	{
		find: /^@n8n\/stores(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'stores', 'src$1'),
	},
	{
		find: /^@n8n\/utils(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'utils', 'src$1'),
	},
	...['orderBy', 'camelCase', 'cloneDeep', 'startCase'].map((name) => ({
		find: new RegExp(`^lodash.${name}$`, 'i'),
		replacement: `lodash/${name}`,
	})),
	{
		find: /^lodash\.(.+)$/,
		replacement: 'lodash/$1',
	},
	{
		// For sanitize-html
		find: 'source-map-js',
		replacement: resolve(__dirname, 'src/source-map-js-shim'),
	},
];

const { RELEASE: release } = process.env;

const plugins: UserConfig['plugins'] = [
	nodePopularityPlugin(),
	icons({
		compiler: 'vue3',
		autoInstall: true,
	}),
	// Add istanbul coverage plugin for E2E tests
	...(process.env.BUILD_WITH_COVERAGE === 'true'
		? [
				istanbul({
					include: 'src/**/*',
					exclude: ['node_modules', 'tests/', 'dist/'],
					extension: ['.js', '.ts', '.vue'],
					forceBuildInstrument: true,
					requireEnv: false,
				}),
			]
		: []),
	viteStaticCopy({
		targets: [
			{
				src: pathPosix.resolve('node_modules/web-tree-sitter/tree-sitter.wasm'),
				dest: resolve(__dirname, 'dist'),
			},
			{
				src: pathPosix.resolve('node_modules/curlconverter/dist/tree-sitter-bash.wasm'),
				dest: resolve(__dirname, 'dist'),
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
	legacy({
		modernTargets: browsers,
		modernPolyfills: true,
		renderLegacyChunks: false,
	}),
	{
		name: 'Insert config script',
		transformIndexHtml: (html, ctx) => {
			// Skip config tags when using Vite dev server. Otherwise the BE
			// will replace it with the actual config script in cli/src/commands/start.ts.
			return ctx.server
				? html
						.replace('%CONFIG_TAGS%', '')
						.replaceAll('/{{BASE_PATH}}', '//localhost:5678')
						.replaceAll('/{{REST_ENDPOINT}}', '/rest')
				: html;
		},
	},
	// For sanitize-html
	nodePolyfills({
		include: ['fs', 'path', 'url', 'util', 'timers'],
	}),
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
					authToken: process.env.SENTRY_AUTH_TOKEN,
					telemetry: false,
					release: {
						name: `n8n@${release}`,
					},
				}),
			]
		: []),
];

const target = browserslistToEsbuild(browsers);

export default mergeConfig(
	defineConfig({
		define: {
			// This causes test to fail but is required for actually running it
			// ...(NODE_ENV !== 'test' ? { 'global': 'globalThis' } : {}),
			...(NODE_ENV === 'development' ? { 'process.env': {} } : {}),
			BASE_PATH: `'${publicPath}'`,
		},
		plugins,
		resolve: { alias },
		base: publicPath,
		envPrefix: ['VUE', 'N8N_ENV_FEAT'],
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: [
						'',
						'@use "@/n8n-theme-variables.scss" as *;',
						'@use "@n8n/design-system/css/mixins" as mixins;',
					].join('\n'),
				},
			},
		},
		build: {
			minify: !!release,
			sourcemap: !!release,
			target,
		},
		optimizeDeps: {
			esbuildOptions: {
				target,
			},
		},
		worker: {
			format: 'es',
		},
	}),
	vitestConfig,
);

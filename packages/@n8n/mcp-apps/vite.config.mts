import vue from '@vitejs/plugin-vue';
import { access, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import icons from 'unplugin-icons/vite';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import svgLoader from 'vite-svg-loader';

import { DEV_APPS, MCP_APPS, type DevAppId, type McpAppId } from './src/apps-manifest';
import { nodePopularityPlugin } from '../../frontend/editor-ui/vite/vite-plugin-node-popularity.mts';

const appsRoot = resolve(__dirname, 'src/apps');
const packagesDir = resolve(__dirname, '..', '..');
const editorUiDir = resolve(packagesDir, 'frontend', 'editor-ui');

/**
 * Aliases mirroring `packages/frontend/editor-ui/vite.config.mts` so that
 * editor-ui sources (the workflow canvas and its transitive imports) can be
 * bundled directly into MCP apps. All workspace packages resolve to sources;
 * their third-party imports resolve from each package's own node_modules.
 */
const editorUiAliases = [
	// The experimental in-canvas NDV can never activate in the MCP preview
	// (it sits behind an experiment flag) but its static import would pull
	// the entire NDV/RunData subtree into the bundle. Stub it out.
	{
		find: /^.*\/ExperimentalEmbeddedNodeDetails\.vue$/,
		replacement: resolve(__dirname, 'vite/empty-component-stub.ts'),
	},
	// editor-ui references assets from its public dir with absolute paths
	{ find: /^\/static\//, replacement: `${resolve(editorUiDir, 'public', 'static')}/` },
	{ find: '@', replacement: resolve(editorUiDir, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
	// Stub out @n8n/expression-runtime for browser build (pulls in isolated-vm)
	{
		find: '@n8n/expression-runtime',
		replacement: resolve(editorUiDir, 'vite/expression-runtime-stub.ts'),
	},
	{ find: '@n8n/i18n', replacement: resolve(packagesDir, 'frontend', '@n8n', 'i18n', 'src') },
	{ find: '@n8n/tournament', replacement: resolve(packagesDir, '@n8n', 'tournament', 'src') },
	{
		find: /^@n8n\/chat(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'chat', 'src$1'),
	},
	{
		find: /^@n8n\/chat-hub(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'chat-hub', 'src$1'),
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
		find: /^@n8n\/frontend-module-sdk$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'frontend-module-sdk', 'src/index.ts'),
	},
	{
		find: /^@n8n\/constants(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'constants', 'src$1'),
	},
	{
		find: /^@n8n\/stores(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'stores', 'src$1'),
	},
	{
		find: /^@n8n\/telemetry$/,
		replacement: resolve(packagesDir, '@n8n', 'telemetry', 'src/index.ts'),
	},
	{
		find: /^@n8n\/telemetry(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'telemetry', 'src$1'),
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
	// For sanitize-html
	{
		find: 'source-map-js',
		replacement: resolve(editorUiDir, 'vite/source-map-js-shim'),
	},
];

export default defineConfig(({ mode }) => {
	// Dev harnesses build like MCP apps but land in dist/dev-apps/, so
	// dist/apps/ only ever contains real MCP resources.
	const isDevApp = mode in DEV_APPS;
	const app = isDevApp ? DEV_APPS[mode as DevAppId] : MCP_APPS[mode as McpAppId];

	if (!app) {
		throw new Error(`Unknown MCP app mode: ${mode}`);
	}

	const appRoot = resolve(appsRoot, app.entry);
	const outDir = resolve(__dirname, isDevApp ? 'dist/dev-apps' : 'dist/apps');

	return {
		root: appRoot,
		define: {
			// Referenced by editor-ui sources (usually injected by the backend)
			BASE_PATH: "'/'",
		},
		plugins: [
			// Serves the `virtual:node-popularity-data` module imported by
			// editor-ui's node creator (falls back to [] without a data file).
			nodePopularityPlugin(),
			vue(),
			svgLoader({
				svgoConfig: {
					plugins: [
						{
							name: 'preset-default',
							params: {
								overrides: {
									cleanupIds: false,
									removeViewBox: false,
								},
							},
						},
					],
				},
			}),
			icons({ compiler: 'vue3', autoInstall: true }),
			viteSingleFile(),
			renameHtmlOutput('index.html', app.htmlFile),
		],
		resolve: {
			alias: [
				{ find: '@mcp-apps', replacement: resolve(__dirname, 'src') },
				{
					find: '@n8n/design-system',
					replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src'),
				},
				...editorUiAliases,
			],
			// mcp-apps and editor-ui resolve these to different .pnpm peer-suffixed
			// copies; bundling two instances breaks their global state (e.g. two
			// Pinia registries, two Vue runtimes).
			dedupe: [
				'vue',
				'vue-i18n',
				'vue-router',
				'pinia',
				'@vue-flow/core',
				'@vueuse/core',
				'element-plus',
				'n8n-workflow',
			],
		},
		css: {
			preprocessorOptions: {
				scss: {
					// editor-ui SCSS relies on these being injected into every file
					additionalData: [
						'',
						'@use "@/app/css/_variables.scss" as *;',
						'@use "@n8n/design-system/css/mixins" as mixins;',
					].join('\n'),
				},
			},
		},
		build: {
			assetsInlineLimit: Number.MAX_SAFE_INTEGER,
			emptyOutDir: true,
			outDir,
			rollupOptions: {
				input: resolve(appRoot, 'index.html'),
			},
		},
	};
});

function renameHtmlOutput(fromFileName: string, toFileName: string): Plugin {
	return {
		name: 'rename-mcp-app-html',
		async writeBundle(options) {
			if (!options.dir) return;

			const from = resolve(options.dir, fromFileName);
			const to = resolve(options.dir, toFileName);

			try {
				await access(from);
			} catch {
				await access(to);
				return;
			}

			await rename(from, to);
		},
	};
}

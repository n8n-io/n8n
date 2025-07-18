import vue from '@vitejs/plugin-vue';
import { posix as pathPosix, resolve } from 'path';
import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgLoader from 'vite-svg-loader';

import { vitestConfig } from '@n8n/vitest-config/frontend';
import icons from 'unplugin-icons/vite';
import iconsResolver from 'unplugin-icons/resolver';
import components from 'unplugin-vue-components/vite';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import legacy from '@vitejs/plugin-legacy';
import browserslist from 'browserslist';

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

const { NODE_ENV } = process.env;

const browsers = browserslist.loadConfig({ path: process.cwd() });

const packagesDir = resolve(__dirname, '..', '..');

const alias = [
	{ find: '@', replacement: resolve(__dirname, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
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

const plugins: UserConfig['plugins'] = [
	icons({
		compiler: 'vue3',
		autoInstall: true,
	}),
	components({
		dts: './src/components.d.ts',
		resolvers: [
			(componentName) => {
				if (componentName.startsWith('N8n'))
					return { name: componentName, from: '@n8n/design-system' };
			},
			iconsResolver({
				prefix: 'Icon',
			}),
		],
	}),
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
			const replacement = ctx.server
				? '' // Skip when using Vite dev server
				: '<script src="/{{REST_ENDPOINT}}/config.js"></script>';

			return html.replace('%CONFIG_SCRIPT%', replacement);
		},
	},
	// For sanitize-html
	nodePolyfills({
		include: ['fs', 'path', 'url', 'util', 'timers'],
	}),
];

const { RELEASE: release } = process.env;
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

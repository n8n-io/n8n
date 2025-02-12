import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgLoader from 'vite-svg-loader';

import { vitestConfig } from '@n8n/frontend-vitest-config';
import icons from 'unplugin-icons/vite';
import iconsResolver from 'unplugin-icons/resolver';
import components from 'unplugin-vue-components/vite';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import legacy from '@vitejs/plugin-legacy';
import browserslist from 'browserslist';
import { posix as pathPosix } from 'path';

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

const { NODE_ENV } = process.env;

const browsers = browserslist.loadConfig({ path: process.cwd() });

const alias = [
	{ find: '@', replacement: resolve(__dirname, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
	{
		find: /^n8n-design-system$/,
		replacement: resolve(__dirname, '..', 'design-system', 'src', 'index.ts'),
	},
	{
		find: /^n8n-design-system\//,
		replacement: resolve(__dirname, '..', 'design-system', 'src') + '/',
	},
	{
		find: /^@n8n\/chat$/,
		replacement: resolve(__dirname, '..', '@n8n', 'chat', 'src', 'index.ts'),
	},
	{
		find: /^@n8n\/chat\//,
		replacement: resolve(__dirname, '..', '@n8n', 'chat', 'src') + '/',
	},
	{
		find: /^@n8n\/composables(.+)$/,
		replacement: resolve(__dirname, '..', 'frontend', '@n8n', 'composables', 'src$1'),
	},
	...['orderBy', 'camelCase', 'cloneDeep', 'startCase'].map((name) => ({
		find: new RegExp(`^lodash.${name}$`, 'i'),
		replacement: `lodash-es/${name}`,
	})),
	{
		find: /^lodash\.(.+)$/,
		replacement: 'lodash-es/$1',
	},
];

const plugins = [
	icons({
		compiler: 'vue3',
		autoInstall: true,
	}),
	components({
		dts: './src/components.d.ts',
		resolvers: [
			iconsResolver({
				prefix: 'icon',
			}),
		],
	}),
	viteStaticCopy({
		targets: [
			{ src: pathPosix.resolve('node_modules/web-tree-sitter/tree-sitter.wasm'), dest: 'public' },
			{
				src: pathPosix.resolve('node_modules/curlconverter/dist/tree-sitter-bash.wasm'),
				dest: 'public',
			},
		],
	}),
	vue(),
	svgLoader(),
	legacy({
		modernTargets: browsers,
		modernPolyfills: true,
		renderLegacyChunks: false,
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
		envPrefix: 'VUE_APP',
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: [
						'',
						'@use "@/n8n-theme-variables.scss" as *;',
						'@use "n8n-design-system/css/mixins" as mixins;',
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

import vue from '@vitejs/plugin-vue2';
import { createHtmlPlugin } from 'vite-plugin-html';
import legacy from '@vitejs/plugin-legacy';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
import path, { resolve } from 'path';
import { defineConfig, mergeConfig, PluginOption } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import packageJSON from './package.json';

const vendorChunks = ['vue', 'vue-router'];
const ignoreChunks = [
	'vue2-boring-avatars',
	'vue-template-compiler',
	'jquery',
	'@fontsource/open-sans',
];

const isScopedPackageToIgnore = (str: string) => /@codemirror\//.test(str);

function renderChunks() {
	const { dependencies } = packageJSON;
	const chunks: Record<string, string[]> = {};

	Object.keys(dependencies).forEach((key) => {
		if ([...vendorChunks, ...ignoreChunks].includes(key)) {
			return;
		}

		if (isScopedPackageToIgnore(key)) return;

		chunks[key] = [key];
	});

	return chunks;
}

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

const lodashAliases = ['orderBy', 'camelCase', 'cloneDeep', 'isEqual'].map((name) => ({
	find: new RegExp(`^lodash.${name}$`, 'i'),
	replacement: require.resolve(`lodash-es/${name}`),
}));

export default mergeConfig(
	defineConfig({
		plugins: [
			legacy({
				targets: ['defaults', 'not IE 11'],
			}),
			vue(),
			...(createHtmlPlugin({
				inject: {
					data: {
						BASE_PATH: publicPath,
					},
				},
			}) as PluginOption[]),
			monacoEditorPlugin({
				publicPath: 'assets/monaco-editor',
				customDistPath: (root: string, buildOutDir: string, base: string) =>
					`${root}/${buildOutDir}/assets/monaco-editor`,
			}) as PluginOption,
		],
		resolve: {
			alias: [
				{ find: '@', replacement: resolve(__dirname, 'src') },
				{ find: 'stream', replacement: '' },
				{
					find: /^n8n-design-system\//,
					replacement: resolve(__dirname, '..', 'design-system', 'src') + '/',
				},
				...lodashAliases,
				{
					find: /^lodash.(.+)$/,
					replacement: 'lodash-es/$1',
				},
				{
					find: 'vue2-boring-avatars',
					replacement: require.resolve('vue2-boring-avatars'),
				},
				{
					find: /element-ui\/(packages|lib)\/button$/,
					replacement: path.resolve(
						__dirname,
						'..',
						'design-system/src/components/N8nButton/overrides/ElButton.ts',
					),
				},
			],
		},
		base: publicPath,
		envPrefix: 'VUE_APP',
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: '\n@use "@/n8n-theme-variables.scss" as *;\n',
				},
			},
		},
		build: {
			assetsInlineLimit: 0,
			sourcemap: false,
			rollupOptions: {
				output: {
					manualChunks: {
						vendor: vendorChunks,
						...renderChunks(),
					},
				},
			},
		},
	}),
	defineVitestConfig({
		test: {
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./src/__tests__/setup.ts'],
		},
	}),
);

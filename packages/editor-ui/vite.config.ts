import vue from '@vitejs/plugin-vue2';
import legacy from '@vitejs/plugin-legacy';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
import path, { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';

import packageJSON from './package.json';

const isCI = process.env.CI === 'true';

const vendorChunks = ['vue', 'vue-router'];
const n8nChunks = ['n8n-workflow', 'n8n-design-system'];
const ignoreChunks = [
	'vue2-boring-avatars',
	'vue-template-compiler',
	'jquery',
	'@fontsource/open-sans',
	'normalize-wheel',
	'stream-browserify',
	'lodash.camelcase',
	'lodash.debounce',
	'lodash.get',
	'lodash.orderby',
	'lodash.set',
];

const isScopedPackageToIgnore = (str: string) => /@codemirror\//.test(str);

function renderChunks() {
	const { dependencies } = packageJSON;
	const chunks: Record<string, string[]> = {};

	Object.keys(dependencies).forEach((key) => {
		if ([...vendorChunks, ...n8nChunks, ...ignoreChunks].includes(key)) {
			return;
		}

		if (isScopedPackageToIgnore(key)) return;

		chunks[key] = [key];
	});

	return chunks;
}

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

const lodashAliases = ['orderBy', 'camelCase', 'cloneDeep', 'isEqual', 'startCase'].map((name) => ({
	find: new RegExp(`^lodash.${name}$`, 'i'),
	replacement: require.resolve(`lodash-es/${name}`),
}));

const { NODE_ENV } = process.env;

export default mergeConfig(
	defineConfig({
		define: {
			// This causes test to fail but is required for actually running it
			...(NODE_ENV !== 'test' ? { global: 'globalThis' } : {}),
			...(NODE_ENV === 'development' ? { process: { env: {} } } : {}),
			BASE_PATH: `'${publicPath}'`,
		},
		plugins: [
			vue(),
			...(!isCI
				? [
						legacy({
							targets: ['defaults', 'not IE 11'],
						}),
						monacoEditorPlugin({
							publicPath: 'assets/monaco-editor',
							customDistPath: (root: string, buildOutDir: string, base: string) =>
								`${root}/${buildOutDir}/assets/monaco-editor`,
						}),
				  ]
				: []),
		],
		resolve: {
			alias: [
				{ find: '@', replacement: resolve(__dirname, 'src') },
				{ find: 'stream', replacement: 'stream-browserify' },
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
			minify: !isCI,
			assetsInlineLimit: 0,
			sourcemap: false,
			rollupOptions: {
				treeshake: !isCI,
				output: {
					manualChunks: {
						vendor: vendorChunks,
						n8n: n8nChunks,
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
			css: {
				modules: {
					classNameStrategy: 'non-scoped',
				},
			},
		},
	}),
);

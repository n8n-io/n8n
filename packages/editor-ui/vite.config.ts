import { createVuePlugin } from 'vite-plugin-vue2';
import { createHtmlPlugin } from 'vite-plugin-html';
import monacoEditorPlugin from "vite-plugin-monaco-editor";
import path, { resolve } from 'path';
import {defineConfig, Plugin, PluginOption} from "vite";

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

export default defineConfig({
	plugins: [
		createVuePlugin(),
		...createHtmlPlugin({
			inject: {
				data: {
					BASE_PATH: publicPath,
				},
			},
		}) as PluginOption[],
		monacoEditorPlugin({
			publicPath: 'assets/monaco-editor',
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
			{
				find: /^lodash.orderby$/,
				replacement: 'lodash-es/orderBy',
			},
			{
				find: /^lodash.camelcase$/,
				replacement: 'lodash-es/camelCase',
			},
			{
				find: /^lodash.(.+)$/,
				replacement: 'lodash-es/$1',
			},
			{
				find: 'vue2-boring-avatars',
				replacement: resolve(__dirname, '..', '..', 'node_modules', 'vue2-boring-avatars', 'dist', 'vue-2-boring-avatars.umd.js'), // Workaround for wrong main/module/exports field in vue2-boring-avatar's package.json
			},
			{
				find: /element-ui\/(packages|lib)\/button$/,
				replacement: path.resolve(__dirname, '..', 'design-system/src/components/N8nButton/overrides/ElButton.ts'),
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
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: [
			'./src/__tests__/setup.ts',
		],
	},
});

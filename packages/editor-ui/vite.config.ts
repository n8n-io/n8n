import { createVuePlugin } from 'vite-plugin-vue2';
import { createHtmlPlugin } from 'vite-plugin-html';
import monacoEditorPlugin from "vite-plugin-monaco-editor";
import { resolve } from 'path';

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

export default {
	plugins: [
		createVuePlugin(),
		createHtmlPlugin({
			inject: {
				data: {
					BASE_PATH: publicPath,
				},
			},
		}),
		monacoEditorPlugin({
			customDistPath: (root, buildOutDir) => `${root}/${buildOutDir}/monacoeditorplugin`,
		}),
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
				find: /^lodash.(.+)$/, // @TODO Remove after lodash-es migration
				replacement: 'lodash-es/$1',
			},
			{
				find: 'vue2-boring-avatars',
				replacement: resolve(__dirname, '..', '..', 'node_modules', 'vue2-boring-avatars', 'dist', 'vue-2-boring-avatars.umd.js'), // Workaround for wrong main/module/exports field in vue2-boring-avatar's package.json
			},
		],
	},
	base: publicPath,
	envPrefix: 'VUE_APP',
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: '\n@import "@/n8n-theme-variables.scss";\n',
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
};

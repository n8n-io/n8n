import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import icons from 'unplugin-icons/vite';
import svgLoader from 'vite-svg-loader';
import path from 'path';
import { lucideIconsPlugin } from '../design-system/src/icons/lucide/vite';
import { editorUiAliases } from '../../editor-ui/vite/aliases.mjs';
import { nodePopularityPlugin } from '../../editor-ui/vite/vite-plugin-node-popularity.mjs';

const editorUiDir = path.resolve(__dirname, '../../editor-ui');

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
	plugins: [
		vue(),
		lucideIconsPlugin(),
		// Stories of editor-ui components can load the node creator, which imports this module.
		nodePopularityPlugin(),
		icons({
			compiler: 'vue3',
			autoInstall: true,
		}),
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
	],
	resolve: {
		alias: [
			{
				find: /^@n8n\/design-system$/,
				replacement: path.resolve(__dirname, '../design-system/src/index.ts'),
			},
			{
				find: /^@n8n\/design-system\/(.*)$/,
				replacement: path.resolve(__dirname, '../design-system/src/$1'),
			},
			{
				find: /^@n8n\/chat$/,
				replacement: path.resolve(__dirname, '../chat/src/index.ts'),
			},
			{
				find: /^@n8n\/chat\/(.*)$/,
				replacement: path.resolve(__dirname, '../chat/src/$1'),
			},
			// Editor-UI aliases
			{
				find: /^@\/(.*)$/,
				replacement: path.resolve(__dirname, '../../editor-ui/src/$1'),
			},
			{
				find: /^@n8n\/i18n$/,
				replacement: path.resolve(__dirname, '../i18n/src/index.ts'),
			},
			{
				find: /^@n8n\/i18n\/(.*)$/,
				replacement: path.resolve(__dirname, '../i18n/src/$1'),
			},
			{
				find: /^@n8n\/stores$/,
				replacement: path.resolve(__dirname, '../stores/src/index.ts'),
			},
			{
				find: /^@n8n\/stores\/(.*)$/,
				replacement: path.resolve(__dirname, '../stores/src/$1'),
			},
			{
				find: /^@n8n\/composables$/,
				replacement: path.resolve(__dirname, '../composables/src/index.ts'),
			},
			{
				find: /^@n8n\/composables\/(.*)$/,
				replacement: path.resolve(__dirname, '../composables/src/$1'),
			},
			{
				find: /^@n8n\/utils$/,
				replacement: path.resolve(__dirname, '../../../@n8n/utils/src/index.ts'),
			},
			{
				find: /^@n8n\/utils\/(.*)$/,
				replacement: path.resolve(__dirname, '../../../@n8n/utils/src/$1'),
			},
			// Stories of editor-ui components load the app graph, such as `n8n-workflow`. They need
			// the same aliases and shims as the editor build.
			...editorUiAliases(editorUiDir, path.resolve(__dirname, '../../..')),
			{ find: /^node:fs$/, replacement: path.resolve(editorUiDir, 'vite/node-fs-shim.ts') },
			// Editor components load files from the editor's public folder, such as `/static/x.gif`.
			{ find: /^\/static\/(.*)$/, replacement: path.resolve(editorUiDir, 'public/static/$1') },
		],
	},
	define: {
		BASE_PATH: "'/'",
		// Node polyfills in the app graph read `process.env` when they load. The dev server does
		// not replace it, so it gets an empty object, as in the editor dev config.
		...(command === 'serve' ? { 'process.env': {} } : {}),
	},
}));

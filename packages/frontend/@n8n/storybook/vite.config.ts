import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import icons from 'unplugin-icons/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		icons({
			compiler: 'vue3',
			autoInstall: true,
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
		],
	},
});

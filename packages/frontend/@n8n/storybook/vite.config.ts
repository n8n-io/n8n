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
		],
	},
});

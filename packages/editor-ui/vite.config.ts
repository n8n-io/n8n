import { createVuePlugin } from 'vite-plugin-vue2';
import { createHtmlPlugin } from 'vite-plugin-html';
import { createI18nPlugin } from '@yfwz100/vite-plugin-vue2-i18n';
import monacoEditorPlugin from "vite-plugin-monaco-editor";
import { resolve } from 'path';

const publicPath = process.env.VUE_APP_PUBLIC_PATH || '/';

export default {
	plugins: [
		createVuePlugin(),
		createHtmlPlugin({
			inject: {
				data: {
					publicPath,
				},
			},
		}),
		createI18nPlugin({
			includes: (id) => id.includes('i18n/locales'),
		}),
		monacoEditorPlugin(),
	],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'vue2-boring-avatars': resolve(__dirname, '..', '..', 'node_modules', 'vue2-boring-avatars', 'dist', 'vue-2-boring-avatars.umd.js'), // Workaround for wrong main/module/exports field in vue2-boring-avatar's package.json
		},
	},
	base: publicPath,
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

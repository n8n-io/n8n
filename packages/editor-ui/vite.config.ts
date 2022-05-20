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

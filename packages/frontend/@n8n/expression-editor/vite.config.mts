import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

const srcPath = resolve(__dirname, 'src');
const packagesDir = resolve(__dirname, '..', '..', '..');

export default defineConfig({
	plugins: [
		vue(),
		// design-system's N8nIcon imports `~icons/...` virtual modules.
		icons({ compiler: 'vue3', autoInstall: true }),
	],
	resolve: {
		alias: [
			{ find: '@', replacement: srcPath },
			{
				find: /^@n8n\/design-system(.*)$/,
				replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src$1'),
			},
			{
				find: /^@n8n\/i18n(.*)$/,
				replacement: resolve(packagesDir, 'frontend', '@n8n', 'i18n', 'src$1'),
			},
		],
	},
	build: {
		cssCodeSplit: false,
		lib: {
			entry: resolve(srcPath, 'index.ts'),
			name: 'N8nExpressionEditor',
			formats: ['es', 'umd'],
			fileName: (format) => `expression-editor.${format}.js`,
		},
		rollupOptions: {
			external: ['vue'],
			output: { exports: 'named', globals: { vue: 'Vue' } },
		},
	},
});

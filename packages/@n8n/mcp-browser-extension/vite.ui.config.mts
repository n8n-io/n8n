/**
 * Vite config for the connect UI page.
 * Bundles connect.html + Vue app into dist/.
 */
import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	root: resolve(__dirname, 'src/ui'),
	base: './',
	plugins: [vue()],
	resolve: {
		alias: {
			'@n8n/design-system': resolve(__dirname, '../../frontend/@n8n/design-system/src'),
		},
	},
	build: {
		sourcemap: true,
		rollupOptions: {
			input: {
				connect: resolve(__dirname, 'src/ui/connect.html'),
			},
			output: {
				entryFileNames: 'connect.js',
				assetFileNames: '[name][extname]',
			},
		},
		outDir: resolve(__dirname, 'dist'),
		emptyOutDir: false,
	},
});

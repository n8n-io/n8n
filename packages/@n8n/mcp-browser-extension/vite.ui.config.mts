/**
 * Vite config for the connect UI page.
 * Bundles connect.html + Vue app into dist/.
 */
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'path';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import icons from 'unplugin-icons/vite';
import svgLoader from 'vite-svg-loader';

/** Copies manifest.json and icons/ into dist/ so the dist folder is a complete unpacked extension. */
function copyExtensionAssets(): Plugin {
	return {
		name: 'copy-extension-assets',
		closeBundle() {
			const distIcons = resolve(__dirname, 'dist/icons');
			mkdirSync(distIcons, { recursive: true });
			copyFileSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'));
			for (const file of readdirSync(resolve(__dirname, 'icons'))) {
				copyFileSync(resolve(__dirname, 'icons', file), resolve(distIcons, file));
			}
		},
	};
}

export default defineConfig({
	root: resolve(__dirname, 'src/ui'),
	base: './',
	plugins: [
		copyExtensionAssets(),
		vue(),
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
		icons({ compiler: 'vue3', autoInstall: true }),
	],
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

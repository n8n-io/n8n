/**
 * Vite config for the service worker (background.ts → background.mjs).
 * Outputs a single ES module suitable for Chrome MV3 service workers.
 */
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		sourcemap: true,
		minify: 'esbuild',
		lib: {
			entry: resolve(__dirname, 'src/background.ts'),
			formats: ['es'],
			fileName: () => 'background.mjs',
		},
		outDir: 'dist',
		// The sw build runs first (see the build script), so it clears stale files;
		// the ui build must keep emptyOutDir: false to preserve background.mjs
		emptyOutDir: true,
		rollupOptions: {
			output: {
				entryFileNames: 'background.mjs',
			},
		},
	},
});

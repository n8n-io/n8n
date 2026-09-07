import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		sourcemap: true,
		minify: 'esbuild',
		lib: {
			entry: resolve(__dirname, 'src/recorder.ts'),
			formats: ['iife'],
			name: 'N8nBrowserRecorder',
			fileName: () => 'recorder.js',
		},
		outDir: 'dist',
		emptyOutDir: false,
		rollupOptions: {
			output: { entryFileNames: 'recorder.js' },
		},
	},
});

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue({
			include: [/\.vue$/, /\.md$/],
		}),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src', 'main.ts'),
			name: 'Inkline',
			fileName: (format) => `inkline.${format}.js`,
		},
		rollupOptions: {
			// make sure to externalize deps that shouldn't be bundled
			// into your library
			external: ['vue'],
			output: {
				exports: 'named',
				// Provide global variables to use in the UMD build
				// for externalized deps
				globals: {
					vue: 'Vue',
				},
			},
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.js'],
		include: ['src/**/*.spec.ts'],
		coverage: {
			exclude: ['**/__mocks__/*'],
			reporter: ['text', 'json', 'html', 'lcov'],
		},
	},
	optimizeDeps: {
		exclude: ['coverage', 'dist', 'lib', 'package', 'scripts'],
	},
});

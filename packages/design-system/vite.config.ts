import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';

const { coverageReporters } = require('../../jest.config.js');

export default mergeConfig(
	defineConfig({
		plugins: [vue()],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'n8n-design-system': resolve(__dirname, 'src'),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, 'src', 'main.ts'),
				name: 'N8nDesignSystem',
				fileName: (format) => `n8n-design-system.${format}.js`,
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
	}),
	defineVitestConfig({
		test: {
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./src/__tests__/setup.ts'],
			coverage: {
				provider: 'v8',
				reporter: coverageReporters,
				all: true,
			},
			css: {
				modules: {
					classNameStrategy: 'non-scoped',
				},
			},
		},
	}),
);

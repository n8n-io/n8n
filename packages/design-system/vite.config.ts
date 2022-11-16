import vue from '@vitejs/plugin-vue2';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';

export default mergeConfig(
	defineConfig({
		plugins: [vue()],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'vue2-boring-avatars': require.resolve('vue2-boring-avatars'),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, 'src', 'main.js'),
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
		},
	}),
);

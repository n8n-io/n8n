import vue from '@vitejs/plugin-vue2';
import { resolve } from 'path';
import { defineConfig, mergeConfig, Plugin } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import { createFilter } from '@rollup/pluginutils';
import { transform } from '@swc/core';

const { coverageReporters } = require('../../jest.config.js');

export function RollupPluginSwc(): Plugin {
	const filter = createFilter(/\.ts$/, /\.js$/);
	const cleanUrl = (url: string) => url.replace(/#.*$/, '').replace(/\?.*$/, '');
	return {
		name: 'rollup-plugin-swc',
		async transform(code, id, options) {
			if (filter(id) || filter(cleanUrl(id))) {
				const result = await transform(code, {
					jsc: {
						target: 'esnext',
						parser: {
							syntax: 'typescript',
						},
					},
					minify: true,
					sourceMaps: true,
					filename: id,
				});
				return {
					code: result.code,
					map: result.map,
				};
			}
		},
	};
}

export const vitestConfig = defineVitestConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/__tests__/setup.ts'],
		coverage: {
			provider: 'c8',
			reporter: coverageReporters,
			all: true,
		},
		css: {
			modules: {
				classNameStrategy: 'non-scoped',
			},
		},
	},
});

export default mergeConfig(
	defineConfig({
		esbuild: false,
		plugins: [vue(), RollupPluginSwc()],
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				'vue2-boring-avatars': require.resolve('vue2-boring-avatars'),
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
	vitestConfig,
);

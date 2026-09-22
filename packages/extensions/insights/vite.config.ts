import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'unplugin-dts/vite';
import { configDefaults as vitestConfig } from 'vitest/config';

const cwd = process.cwd();

export default defineConfig({
	plugins: [
		vue(),
		dts({
			tsconfigPath: resolve(cwd, 'tsconfig.frontend.json'),
			processor: 'vue',
		}),
	],
	build: {
		emptyOutDir: false,
		outDir: resolve(cwd, 'dist', 'frontend'),
		lib: {
			entry: resolve(cwd, 'src', 'frontend', 'index.ts'),
			name: 'n8nFrontEndSdk',
			fileName: 'index',
		},
		rollupOptions: {
			external: ['vue'],
			output: {
				preserveModules: false,
				globals: {
					vue: 'Vue',
				},
			},
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['src/__tests__/setup.ts'],
		include: ['src/**/*.spec.ts'],
		exclude: vitestConfig.exclude,
	},
});

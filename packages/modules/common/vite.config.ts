import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { configDefaults as vitestConfig } from 'vitest/config';

const cwd = process.cwd();

export default defineConfig({
	plugins: [vue(), dts({ rollupTypes: true })],
	build: {
		lib: {
			entry: resolve(cwd, 'src', 'index.ts'),
			name: 'n8nModuleCommon',
			fileName: 'n8n-module-common',
		},
		rollupOptions: {
			external: ['vue'],
			output: {
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
		include: ['src/**/*.spec.{ts,tsx}'],
		exclude: vitestConfig.exclude,
	},
});

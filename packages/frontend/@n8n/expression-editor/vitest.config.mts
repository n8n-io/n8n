import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/frontend';

const srcPath = resolve(__dirname, 'src');
const packagesDir = resolve(__dirname, '..', '..', '..');

export default mergeConfig(
	defineConfig({
		plugins: [vue()],
		resolve: {
			alias: [
				{ find: '@', replacement: srcPath },
				{
					find: /^@n8n\/i18n(.*)$/,
					replacement: resolve(packagesDir, 'frontend', '@n8n', 'i18n', 'src$1'),
				},
			],
		},
	}),
	createVitestConfig({
		include: ['src/**/*.test.ts'],
		setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
	}),
);

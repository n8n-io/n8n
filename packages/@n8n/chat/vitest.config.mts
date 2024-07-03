import { resolve } from 'path';
import { mergeConfig } from 'vite';
import { type UserConfig } from 'vitest';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.mts';

const srcPath = resolve(__dirname, 'src');
const vitestConfig = defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		root: srcPath,
		setupFiles: ['./src/__tests__/setup.ts'],
		...(process.env.COVERAGE_ENABLED === 'true'
			? {
					coverage: {
						enabled: true,
						provider: 'v8',
						reporter: process.env.CI === 'true' ? 'cobertura' : 'text-summary',
						all: true,
					},
			  }
			: {}),
	},
}) as UserConfig;

export default mergeConfig(
	viteConfig,
	vitestConfig,
);

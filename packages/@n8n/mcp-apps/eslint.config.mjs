import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(
	{
		ignores: ['vite.config.mts', 'vitest.config.mts', 'dist/**'],
	},
	frontendConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		files: ['src/apps/**/*.vue'],
		rules: {
			'unicorn/filename-case': ['error', { case: 'pascalCase' }],
		},
	},
	{
		files: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
		rules: {
			'n8n-local-rules/no-uncaught-json-parse': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'id-denylist': 'off',
		},
	},
);

import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	{
		ignores: ['vite.*.config.mts'],
	},
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'camelCase' }],
		},
	},
	{
		files: ['src/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'n8n-local-rules/no-uncaught-json-parse': 'off',
		},
	},
);

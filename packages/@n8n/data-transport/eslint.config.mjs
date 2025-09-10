import { defineConfig } from 'eslint/config';
import { baseConfig } from '../eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-return': 'warn',
		},
	},
);

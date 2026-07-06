import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		// Core must stay free of DB/DI coupling: it declares the contracts, the
		// storage layer (and eventually the cli) satisfies them.
		files: ['src/core/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: ['@n8n/db', '@n8n/di', '@n8n/typeorm'],
				},
			],
		},
	},
);

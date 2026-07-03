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
		// Core must stay free of DB/DI coupling; enums.ts is the deliberate seam that re-exports DB enums for core use.
		files: ['src/core/**/*.ts'],
		ignores: ['src/core/enums.ts'],
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

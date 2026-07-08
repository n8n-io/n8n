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
		// This package must stay free of DB/DI coupling: it declares the contracts,
		// the host (cli's DurableScheduler) satisfies them.
		files: ['src/**/*.ts'],
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

import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(
	{ ignores: ['playground/**', 'examples/**', 'vitest.integration.config.*'] },
	nodeConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		files: ['src/__tests__/integration/**/*.ts'],
		rules: {
			'@typescript-eslint/require-await': 'off',
			'n8n-local-rules/no-uncaught-json-parse': 'off',
		},
	},
);

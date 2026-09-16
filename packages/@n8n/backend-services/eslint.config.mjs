import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	backendConfig,
	{
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
		},
	},
	{
		files: ['src/**/__tests__/**/*.ts'],
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
		},
	},
);

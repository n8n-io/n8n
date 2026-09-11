import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	backendConfig,
	{
		rules: {
			complexity: 'error',

			'@typescript-eslint/no-require-imports': 'warn',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'n8n-local-rules/no-uncaught-json-parse': 'warn',
			'import-x/no-duplicates': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
		},
	},
);

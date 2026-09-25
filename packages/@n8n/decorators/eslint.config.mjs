import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	backendConfig,
	{
		rules: {
			'import-x/export': 'warn',
		},
	},
	{
		files: ['src/redactable.ts'],
		rules: {
			'@typescript-eslint/no-base-to-string': 'warn',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'import-x/no-duplicates': 'warn',
		},
	},
);

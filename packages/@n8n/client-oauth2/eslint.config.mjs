import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	backendConfig,
	{
		rules: {
			'@typescript-eslint/consistent-type-imports': 'error',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			// TODO: Remove this
			'id-denylist': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
		},
	},
	{
		files: ['src/client-oauth2.ts'],
		// This package is a standalone OAuth2 client and predates the
		// backend-network factory. Route it through the factory, then delete this.
		rules: {
			'n8n-local-rules/no-uncentralized-http': 'off',
		},
	},
);

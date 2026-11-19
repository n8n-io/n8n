import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(backendConfig, {
	files: ['**/*.test.ts'],
	rules: {
		'n8n-local-rules/no-uncaught-json-parse': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/unbound-method': 'warn',
	},
});

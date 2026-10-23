import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(backendConfig, {
	files: ['**/*.config.ts'],
	rules: {
		'n8n-local-rules/no-untyped-config-class-field': 'error',
	},
});

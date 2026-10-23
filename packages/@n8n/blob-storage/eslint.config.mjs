import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(backendConfig, {
	// Relax type-aware unsafe rules for untyped mock plumbing, mirroring n8n-core
	files: ['**/__tests__/**/*.ts'],
	rules: {
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
	},
});

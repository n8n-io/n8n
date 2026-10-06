import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';
import contractLint from '@n8n/node-sdk/lint';

export default defineConfig(backendConfig, {
	files: ['src/nodes/**/*.ts'],
	plugins: { 'n8n-contract': contractLint },
	rules: { 'n8n-contract/no-raw-error': 'error', 'n8n-contract/no-redefault': 'error' },
});

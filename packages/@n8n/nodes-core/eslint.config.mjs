import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';
import contractLint from '@n8n/node-sdk/lint';

// Packed bundles are test fixtures and keep their bytes.
export default defineConfig(globalIgnores(['fixtures/versions/**']), backendConfig, {
	files: ['src/nodes/**/*.ts'],
	plugins: { 'n8n-contract': contractLint },
	rules: { 'n8n-contract/no-raw-error': 'error', 'n8n-contract/no-redefault': 'error' },
});

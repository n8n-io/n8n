import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	// Test fixtures: plain JavaScript files whose names n8n's loaders need (class name = file name).
	ignorePatterns: ['dist/**', 'test-fixtures/**'],
});

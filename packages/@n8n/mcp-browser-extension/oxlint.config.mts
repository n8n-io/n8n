import { frontendConfig } from '@n8n/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	// oxlint does not inherit `settings` through `extends`.
	settings: frontendConfig.settings,
	ignorePatterns: ['vite.*.config.mts', 'vitest.config.mts', 'scripts/**'],
	rules: {
		'typescript/no-deprecated': 'off',
		'unicorn/filename-case': ['error', { case: 'camelCase' }],
	},
	overrides: [
		{
			// Vue components keep PascalCase file names.
			files: ['src/**/*.vue'],
			rules: { 'unicorn/filename-case': ['error', { case: 'pascalCase' }] },
		},
		{
			files: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
			rules: {
				'n8n-local-rules/no-uncaught-json-parse': 'off',
				'typescript/no-unsafe-assignment': 'off',
			},
		},
	],
});

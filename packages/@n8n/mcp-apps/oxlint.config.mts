import { defineConfig } from 'oxlint';
import { frontendConfig } from '@n8n/oxlint-config/frontend';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	// Not inherited through `extends`.
	ignorePatterns: frontendConfig.ignorePatterns,
	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
	},
	overrides: [
		{
			files: ['src/apps/**/*.vue'],
			rules: { 'unicorn/filename-case': ['error', { case: 'pascalCase' }] },
		},
		{
			files: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
			rules: {
				'n8n-local-rules/no-uncaught-json-parse': 'off',
				'typescript/no-unsafe-assignment': 'off',
				'typescript/no-unsafe-argument': 'off',
				'typescript/no-explicit-any': 'off',
				'id-denylist': 'off',
			},
		},
	],
});

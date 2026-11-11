import { baseConfig } from '@n8n/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	ignorePatterns: ['vite.*.config.mts', 'vitest.config.mts', 'scripts/**', '**/*.vue'],
	rules: {
		'typescript/no-deprecated': 'off',
		'unicorn/filename-case': ['error', { case: 'camelCase' }],
	},
	overrides: [
		{
			files: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
			rules: {
				'n8n-local-rules/no-uncaught-json-parse': 'off',
				'typescript/no-unsafe-assignment': 'off',
			},
		},
	],
});

import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['coverage/**', 'vitest.config.*.ts', 'evaluations/programmatic/python/.venv/**'],
	rules: {
		complexity: 'error',
	},
	overrides: [
		{
			files: ['./src/test/**/*.ts', './**/*.test.ts'],
			rules: {
				'typescript/no-unsafe-assignment': 'warn',
			},
		},
		{
			files: ['./evaluations/**/*.ts'],
			jsPlugins: ['@n8n/oxlint-config/import-x-alias'],
			rules: {
				'import-x-alias/no-extraneous-dependencies': ['error', { devDependencies: true }],
			},
		},
	],
});

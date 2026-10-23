import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	rules: { complexity: 'error' },
	overrides: [
		{
			files: ['src/js-task-runner/js-task-runner.ts'],
			rules: { 'typescript/no-require-imports': 'warn' },
		},
		{
			files: ['**/*.test.ts'],
			rules: {
				'import/no-duplicates': 'warn',
				'typescript/unbound-method': 'warn',
				'typescript/no-unsafe-argument': 'warn',
				'typescript/no-unsafe-member-access': 'warn',
				'typescript/no-unsafe-assignment': 'warn',
			},
		},
	],
});

import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['compiled/**', 'vitest.integration.config.ts'],
	overrides: [
		{
			files: [
				'src/database/migrations/1778529600000-CreateWorkflowExecution.ts',
				'src/database/migrations/1784890100000-CreateWorkflowStepExecution.ts',
				'src/database/migrations/1791417600000-CreateWorkflowSeededStep.ts',
			],
			rules: { 'unicorn/filename-case': 'off' },
		},
	],
});

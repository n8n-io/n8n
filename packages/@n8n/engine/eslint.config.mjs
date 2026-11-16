import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	{ ignores: ['compiled/**', 'vitest.integration.config.ts'] },
	backendConfig,
	{
		files: [
			'src/database/migrations/1778529600000-CreateWorkflowExecution.ts',
			'src/database/migrations/1784890100000-CreateWorkflowStepExecution.ts',
		],
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
);

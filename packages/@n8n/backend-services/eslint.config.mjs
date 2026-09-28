import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

// Policy twin of oxlint.config.mts for the tools that read ESLint configs (guardrails, code-health).
export default defineConfig(
	globalIgnores(['coverage/**', 'vitest.config.ts']),
	backendConfig,
	{
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
			'n8n-local-rules/no-guardrail-disable': [
				'error',
				{
					guarded: [
						{
							rule: 'misplaced-n8n-typeorm-import',
							message:
								'Keep TypeORM in the persistence layer: put the query behind a use-case repository method in @n8n/db.',
						},
						{
							rule: 'no-unsealed-workflow-entity-write',
							message: 'Route the write through a token-gated `WorkflowRepository` method.',
						},
						{
							rule: 'no-unsealed-credentials-entity-write',
							message: 'Route the write through a token-gated `CredentialsRepository` method.',
						},
					],
				},
			],
			'n8n-local-rules/no-type-unsafe-event-emitter': 'error',
		},
	},
	{
		files: ['./test/**/*.ts', './src/**/__tests__/**/*.ts'],
		rules: {
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
			'n8n-local-rules/no-type-unsafe-event-emitter': 'off',
			// `vi.importActual<typeof import('x')>('x')` needs inline import types.
			'@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
		},
	},
);

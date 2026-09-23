import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

// Same rule set as packages/cli/oxlint.config.mts, so a file moved from cli lints the same way.
export default defineConfig({
	extends: [backendConfig],
	ignorePatterns: ['coverage/**', 'eslint.guardrails.config.mjs'],
	rules: {
		'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
		// The narrow ESLint guardrail config owns no-unsealed-workflow-entity-write.
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
				],
			},
		],
		'n8n-local-rules/no-type-unsafe-event-emitter': 'error',
	},
	overrides: [
		{
			files: ['./test/**/*.ts', './src/**/__tests__/**/*.ts'],
			// An override that names a jsPlugin rule must re-declare the plugin.
			jsPlugins: ['@n8n/eslint-config/plugin'],
			rules: {
				'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
				'n8n-local-rules/no-type-unsafe-event-emitter': 'off',
			},
		},
	],
});

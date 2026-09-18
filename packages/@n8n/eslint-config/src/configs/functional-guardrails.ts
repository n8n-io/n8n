import tseslint from 'typescript-eslint';
import { localRulesPlugin } from '../plugin.js';

/**
 * Type-aware production guards that Oxlint cannot execute. Keep this config
 * small so packages can run it beside Oxlint without loading general lint rules.
 */
export const functionalGuardrailsConfig = tseslint.config({
	files: ['**/*.ts'],
	plugins: { 'n8n-local-rules': localRulesPlugin },
	languageOptions: {
		parser: tseslint.parser,
		parserOptions: { projectService: true },
	},
	rules: {
		'n8n-local-rules/no-legacy-cipher-methods': 'error',
		'n8n-local-rules/no-misplaced-cipher-primitives': 'error',
		'n8n-local-rules/no-deployment-key-delete': 'error',
		'n8n-local-rules/no-unsealed-workflow-entity-write': 'error',
		'n8n-local-rules/no-unsealed-credentials-entity-write': 'error',
		'n8n-local-rules/no-encryption-guardrail-disable': 'error',
		'n8n-local-rules/no-guardrail-disable': [
			'error',
			{
				guarded: [
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
	},
});

export default functionalGuardrailsConfig;

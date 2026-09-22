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
		'n8n-local-rules/no-encryption-guardrail-disable': 'error',
	},
});

export default functionalGuardrailsConfig;

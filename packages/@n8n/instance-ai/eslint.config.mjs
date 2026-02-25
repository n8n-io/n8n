import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	rules: {
		// Mastra tool names are kebab-case identifiers (e.g. 'list-workflows')
		// which require quotes in object literals — skip naming checks for those
		'@typescript-eslint/naming-convention': [
			'error',
			{
				selector: 'objectLiteralProperty',
				modifiers: ['requiresQuotes'],
				format: null,
			},
		],
	},
});

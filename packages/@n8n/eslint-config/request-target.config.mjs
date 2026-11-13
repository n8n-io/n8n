import tsParser from '@typescript-eslint/parser';

import { localRulesPlugin } from './dist/plugin.js';

export default [
	{
		files: ['**/*.ts'],
		ignores: ['**/dist/**', '**/*.test.ts', '**/test/**', '**/tests/**', '**/__tests__/**'],
		languageOptions: { parser: tsParser },
		plugins: { 'n8n-local-rules': localRulesPlugin },
		linterOptions: { reportUnusedDisableDirectives: 'off' },
		rules: { 'n8n-local-rules/require-request-target': 'error' },
	},
];

import type { ESLint } from 'eslint';
import { rules } from './rules/index.js';

const plugin = {
	meta: {
		name: 'n8n-local-rules',
	},
	configs: {},
	// @ts-expect-error Rules type does not match for typescript-eslint and eslint
	rules: rules as ESLint.Plugin['rules'],
} satisfies ESLint.Plugin;

export const localRulesPlugin = {
	...plugin,
	configs: {
		recommended: {
			plugins: {
				'n8n-local-rules': plugin,
			},
			rules: {
				'n8n-local-rules/no-uncaught-json-parse': 'error',
				'n8n-local-rules/no-json-parse-json-stringify': 'error',
				'n8n-local-rules/no-unneeded-backticks': 'error',
				'n8n-local-rules/no-interpolation-in-regular-string': 'error',
				'n8n-local-rules/no-unused-param-in-catch-clause': 'error',
				'n8n-local-rules/no-useless-catch-throw': 'error',
			},
		},
	},
} satisfies ESLint.Plugin;

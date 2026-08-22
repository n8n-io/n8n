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
				'n8n-local-rules/no-internal-package-import': 'error',
				'n8n-local-rules/no-type-only-import-in-di': 'error',
				'n8n-local-rules/no-aws-credential-discovery-imports': 'error',
				'n8n-local-rules/no-application-error': 'error',
				'n8n-local-rules/no-dynamic-regexp': 'warn',
				'n8n-local-rules/no-restricted-sleep-definition': 'error',
				'n8n-local-rules/no-restricted-sleep-import': 'error',
				// Enabled repo-wide rather than in the test-file override in base.ts: the
				// override's globs miss `*.spec.ts`, and some packages narrow them further.
				// The rule only matches `it.todo`-shaped calls, so it is inert elsewhere.
				'n8n-local-rules/no-todo-test-with-body': 'error',
			},
		},
	},
} satisfies ESLint.Plugin;

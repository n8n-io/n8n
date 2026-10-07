import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['bin/*.js', 'nodes-testing/*.ts', 'nodes-testing/*.cjs', 'coverage/*'],
	rules: {
		complexity: ['error', 27],
		'n8n-local-rules/no-dynamic-regexp': 'error',
	},
	overrides: [
		{
			files: [
				'src/execution-engine/node-execution-context/execute-context.ts',
				'src/execution-engine/node-execution-context/execute-single-context.ts',
				'src/execution-engine/node-execution-context/supply-data-context.ts',
				'src/execution-engine/node-execution-context/utils/get-input-connection-data.ts',
				'src/nodes-loader/directory-loader.ts',
			],
			rules: { 'no-prototype-builtins': 'warn' },
		},
		{
			files: ['src/execution-engine/node-execution-context/utils/get-input-connection-data.ts'],
			rules: { 'no-ex-assign': 'warn' },
		},
		{
			files: [
				'src/execution-engine/node-execution-context/utils/request-helpers/pagination.ts',
				'src/execution-engine/node-execution-context/utils/webhook-helper-functions.ts',
				'src/execution-engine/routing-node.ts',
			],
			rules: { 'typescript/no-base-to-string': 'warn' },
		},
		{
			files: ['src/nodes-loader/load-class-in-isolation.ts', 'test/helpers/index.ts'],
			rules: { 'typescript/no-require-imports': 'warn' },
		},
		{
			files: [
				'src/execution-engine/node-execution-context/__tests__/execute-single-context.test.ts',
			],
			rules: { 'typescript/no-array-delete': 'warn' },
		},
		{
			files: ['**/*.test.ts', '**/test/**/*.ts', '**/__test__/**/*.ts', '**/__tests__/**/*.ts'],
			jsPlugins: ['@n8n/eslint-config/plugin'],
			rules: {
				'prefer-const': 'warn',
				'import/no-duplicates': 'warn',
				'typescript/no-unsafe-assignment': 'warn',
				'typescript/no-unsafe-argument': 'warn',
				'typescript/no-unsafe-call': 'warn',
				'typescript/no-unsafe-return': 'warn',
				'typescript/unbound-method': 'warn',
				'no-unused-expressions': 'warn',
				'id-denylist': 'warn',
				'n8n-local-rules/no-dynamic-regexp': 'off',
			},
		},
	],
});

import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	backendConfig,
	globalIgnores(['bin/*.js', 'nodes-testing/*.ts', 'nodes-testing/*.cjs', 'coverage/*']),
	{
		rules: {
			// TODO: Lower the complexity threshold
			complexity: ['error', 27],
			'n8n-local-rules/no-dynamic-regexp': 'error',
		},
	},
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
		rules: { '@typescript-eslint/no-base-to-string': 'warn' },
	},
	{
		files: ['src/nodes-loader/load-class-in-isolation.ts', 'test/helpers/index.ts'],
		rules: { '@typescript-eslint/no-require-imports': 'warn' },
	},
	{
		files: ['src/execution-engine/node-execution-context/__tests__/execute-single-context.test.ts'],
		rules: { '@typescript-eslint/no-array-delete': 'warn' },
	},
	{
		files: ['src/execution-engine/__tests__/routing-node.test.ts'],
		rules: { '@typescript-eslint/prefer-optional-chain': 'warn' },
	},
	{
		files: ['**/*.test.ts', '**/test/**/*.ts', '**/__test__/**/*.ts', '**/__tests__/**/*.ts'],
		rules: {
			// TODO: Remove these
			'prefer-const': 'warn',
			'import-x/no-duplicates': 'warn',
			'import-x/no-default-export': 'warn',
			'n8n-local-rules/no-uncaught-json-parse': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'id-denylist': 'warn',
			'n8n-local-rules/no-dynamic-regexp': 'off',
		},
	},
);

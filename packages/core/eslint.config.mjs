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

			// TODO: Remove these
			'no-prototype-builtins': 'warn',
			'no-ex-assign': 'warn',
			'no-useless-escape': 'warn',
			'@typescript-eslint/no-require-imports': 'warn',
			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/no-array-delete': 'warn',
		},
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

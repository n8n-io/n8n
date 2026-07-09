import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

// Mirrors the rule leniency of `packages/cli` (this module was extracted from
// there): the same patterns that were warnings in cli stay warnings here.
export default defineConfig(
	nodeConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			// Whole package is backend-module code; matches cli's module override.
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',

			'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
			'import-x/no-cycle': 'warn',
			'import-x/extensions': 'warn',
			'import-x/order': 'warn',
			'no-ex-assign': 'warn',
			'no-case-declarations': 'warn',
			'no-fallthrough': 'warn',
			'no-unsafe-optional-chaining': 'warn',
			'no-empty': 'warn',
			'no-async-promise-executor': 'warn',
			complexity: 'warn',
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/no-empty-object-type': 'warn',
			'@typescript-eslint/prefer-promise-reject-errors': 'warn',
			'@typescript-eslint/no-unsafe-function-type': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/no-redundant-type-constituents': 'warn',
			'@typescript-eslint/no-restricted-types': 'warn',
			'@typescript-eslint/no-unsafe-enum-comparison': 'warn',
			'@typescript-eslint/no-unsafe-declaration-merging': 'warn',
			'@typescript-eslint/only-throw-error': 'warn',
			'@typescript-eslint/no-require-imports': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/array-type': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'no-useless-escape': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/no-duplicate-type-constituents': 'warn',
		},
	},
	{
		files: ['src/**/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
			'id-denylist': 'warn',
			'prefer-const': 'warn',
			'import-x/no-duplicates': 'warn',
			'import-x/no-default-export': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
			'n8n-local-rules/no-uncaught-json-parse': 'warn',
		},
	},
	{
		files: ['**/*.module.ts'],
		rules: {
			'n8n-local-rules/no-top-level-relative-imports-in-backend-module': 'error',
			'n8n-local-rules/no-constructor-in-backend-module': 'error',
		},
	},
);

import { globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import-x';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import stylisticPlugin from '@stylistic/eslint-plugin';
import unicornPlugin from 'eslint-plugin-unicorn';
import lodashPlugin from 'eslint-plugin-lodash';
import { localRulesPlugin } from '../plugin.js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

export const baseConfig = tseslint.config(
	globalIgnores([
		'node_modules/**',
		'dist/**',
		'eslint.config.mjs',
		'tsup.config.ts',
		'jest.config.js',
		'cypress.config.js',
		'vite.config.ts',
		'vitest.config.ts',
	]),
	eslint.configs.recommended,
	tseslint.configs.recommended,
	tseslint.configs.recommendedTypeChecked,
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.typescript,
	eslintConfigPrettier,
	localRulesPlugin.configs.recommended,
	{
		plugins: {
			'unused-imports': unusedImportsPlugin,
			'@stylistic': stylisticPlugin,
			lodash: lodashPlugin,
			unicorn: unicornPlugin,
			'@typescript-eslint': typescriptPlugin,
		},
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
		settings: {
			'import-x/resolver-next': [createTypeScriptImportResolver()],
		},
		rules: {
			// ******************************************************************
			//                     additions to base ruleset
			// ******************************************************************

			// ----------------------------------
			//              ESLint
			// ----------------------------------

			/**
			 * https://eslint.org/docs/rules/id-denylist
			 */
			'id-denylist': [
				'error',
				'err',
				'cb',
				'callback',
				'any',
				'Number',
				'number',
				'String',
				'string',
				'Boolean',
				'boolean',
				'Undefined',
				'undefined',
			],

			/**
			 * https://eslint.org/docs/latest/rules/no-void
			 */
			'no-void': ['error', { allowAsStatement: true }],

			/**
			 * https://eslint.org/docs/latest/rules/indent
			 *
			 * Delegated to Prettier.
			 */
			indent: 'off',

			/**
			 * https://eslint.org/docs/latest/rules/no-constant-binary-expression
			 */
			'no-constant-binary-expression': 'error',

			/**
			 * https://eslint.org/docs/latest/rules/sort-imports
			 */
			'sort-imports': 'off', // @TECH_DEBT: Enable, prefs to be decided - N8N-5821

			// ----------------------------------
			//        @typescript-eslint
			// ----------------------------------

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/array-type.md
			 */
			'@typescript-eslint/array-type': ['error', { default: 'array-simple' }],

			/** https://typescript-eslint.io/rules/await-thenable/ */
			'@typescript-eslint/await-thenable': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-ts-comment.md
			 */
			'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],

			/**
			 * https://typescript-eslint.io/rules/no-restricted-types
			 */
			'@typescript-eslint/no-restricted-types': [
				'error',
				{
					types: {
						Object: {
							message: 'Use object instead',
							fixWith: 'object',
						},
						String: {
							message: 'Use string instead',
							fixWith: 'string',
						},
						Boolean: {
							message: 'Use boolean instead',
							fixWith: 'boolean',
						},
						Number: {
							message: 'Use number instead',
							fixWith: 'number',
						},
						Symbol: {
							message: 'Use symbol instead',
							fixWith: 'symbol',
						},
						Function: {
							message: [
								'The `Function` type accepts any function-like value.',
								'It provides no type safety when calling the function, which can be a common source of bugs.',
								'It also accepts things like class declarations, which will throw at runtime as they will not be called with `new`.',
								'If you are expecting the function to accept certain arguments, you should explicitly define the function shape.',
							].join('\n'),
						},
					},
				},
			],

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/consistent-type-assertions.md
			 */
			'@typescript-eslint/consistent-type-assertions': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/consistent-type-imports.md
			 */
			'@typescript-eslint/consistent-type-imports': 'error',

			'@typescript-eslint/consistent-type-exports': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/member-delimiter-style.md
			 */
			'@stylistic/member-delimiter-style': [
				'error',
				{
					multiline: {
						delimiter: 'semi',
						requireLast: true,
					},
					singleline: {
						delimiter: 'semi',
						requireLast: false,
					},
				},
			],

			// Not needed because we use Biome formatting
			'@stylistic/ident': 'off',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/naming-convention.md
			 */
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'default',
					format: ['camelCase'],
				},
				{
					selector: 'import',
					format: ['camelCase', 'PascalCase'],
				},
				{
					selector: 'variable',
					format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
					leadingUnderscore: 'allowSingleOrDouble',
					trailingUnderscore: 'allowSingleOrDouble',
				},
				{
					selector: 'property',
					format: ['camelCase', 'snake_case', 'UPPER_CASE'],
					leadingUnderscore: 'allowSingleOrDouble',
					trailingUnderscore: 'allowSingleOrDouble',
				},
				{
					selector: 'typeLike',
					format: ['PascalCase'],
				},
				{
					selector: ['method', 'function', 'parameter'],
					format: ['camelCase'],
					leadingUnderscore: 'allowSingleOrDouble',
				},
			],

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-invalid-void-type.md
			 */
			'@typescript-eslint/no-invalid-void-type': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-misused-promises.md
			 */
			'@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/v4.30.0/packages/eslint-plugin/docs/rules/no-floating-promises.md
			 */
			'@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/v4.33.0/packages/eslint-plugin/docs/rules/no-namespace.md
			 */
			'@typescript-eslint/no-namespace': 'off',

			/**
			 * https://typescript-eslint.io/rules/only-throw-error/
			 */
			'@typescript-eslint/only-throw-error': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unnecessary-boolean-literal-compare.md
			 */
			'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unnecessary-qualifier.md
			 */
			'@typescript-eslint/no-unnecessary-qualifier': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unused-expressions.md
			 */
			'@typescript-eslint/no-unused-expressions': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/prefer-nullish-coalescing.md
			 */
			'@typescript-eslint/prefer-nullish-coalescing': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/prefer-optional-chain.md
			 */
			'@typescript-eslint/prefer-optional-chain': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/promise-function-async.md
			 */
			'@typescript-eslint/promise-function-async': 'error',

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/triple-slash-reference.md
			 */
			'@typescript-eslint/triple-slash-reference': 'off', // @TECH_DEBT: Enable, disallowing in all cases - N8N-5820

			/**
			 * https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/return-await.md
			 */
			'@typescript-eslint/return-await': ['error', 'always'],

			/**
			 * https://typescript-eslint.io/rules/explicit-member-accessibility/
			 */
			'@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],

			// ----------------------------------
			//       eslint-plugin-import
			// ----------------------------------

			/**
			 * https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md
			 */
			'import-x/no-cycle': ['error', { ignoreExternal: false, maxDepth: 3 }],

			/**
			 * https://github.com/import-js/eslint-plugin-import/blob/master/docs/rules/no-default-export.md
			 */
			'import-x/no-default-export': 'error',

			/**
			 * https://github.com/import-js/eslint-plugin-import/blob/master/docs/rules/order.md
			 */
			'import-x/order': [
				'error',
				{
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
					groups: [['builtin', 'external'], 'internal', ['parent', 'index', 'sibling'], 'object'],
					'newlines-between': 'always',
				},
			],

			/**
			 * https://github.com/import-js/eslint-plugin-import/blob/HEAD/docs/rules/no-duplicates.md
			 */
			'import-x/no-duplicates': 'error',

			/**
			 * https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md
			 */
			'import-x/prefer-default-export': 'off',

			// These rules are not needed as TypeScript handles them
			'import-x/named': 'off',
			'import-x/namespace': 'off',
			'import-x/default': 'off',
			'import-x/no-named-as-default-member': 'off',
			'import-x/no-unresolved': 'off',

			// ******************************************************************
			//                    overrides to base ruleset
			// ******************************************************************

			// ----------------------------------
			//              ESLint
			// ----------------------------------

			/**
			 * https://eslint.org/docs/rules/class-methods-use-this
			 */
			'class-methods-use-this': 'off',

			/**
			 * https://eslint.org/docs/rules/eqeqeq
			 */
			eqeqeq: 'error',

			/**
			 * https://eslint.org/docs/rules/no-plusplus
			 */
			'no-plusplus': 'off',

			/**
			 * https://eslint.org/docs/rules/object-shorthand
			 */
			'object-shorthand': 'error',

			/**
			 * https://eslint.org/docs/rules/prefer-const
			 */
			'prefer-const': 'error',

			/**
			 * https://eslint.org/docs/rules/prefer-spread
			 */
			'prefer-spread': 'off',

			// These are tuned off since we use `noUnusedLocals` and `noUnusedParameters` now
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'off',

			/**
			 * https://www.typescriptlang.org/docs/handbook/enums.html#const-enums
			 */
			'no-restricted-syntax': [
				'error',
				{
					selector: 'TSEnumDeclaration:not([const=true])',
					message:
						'Do not declare raw enums as it leads to runtime overhead. Use const enum instead. See https://www.typescriptlang.org/docs/handbook/enums.html#const-enums',
				},
			],

			// ----------------------------------
			//         no-unused-imports
			// ----------------------------------

			/**
			 * https://github.com/sweepline/eslint-plugin-unused-imports/blob/master/docs/rules/no-unused-imports.md
			 */
			'unused-imports/no-unused-imports': process.env.NODE_ENV === 'development' ? 'warn' : 'error',

			/** https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-unnecessary-await.md */
			'unicorn/no-unnecessary-await': 'error',

			/** https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-useless-promise-resolve-reject.md */
			'unicorn/no-useless-promise-resolve-reject': 'error',

			'lodash/path-style': ['error', 'as-needed'],
			'lodash/import-scope': ['error', 'method'],
		},
	},
	{
		// Rules for unit tests
		files: ['test/**/*.ts', '**/__tests__/*.ts', '**/*.test.ts', '**/*.cy.ts'],
		rules: {
			'n8n-local-rules/no-plain-errors': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'n8n-local-rules/no-skipped-tests': process.env.NODE_ENV === 'development' ? 'warn' : 'error',
		},
	},
);

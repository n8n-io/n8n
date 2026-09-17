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
			// Neutralize the string-based parser mapping added by import-x's TS preset.
			// A string parser path makes import-x re-`require('@typescript-eslint/parser')`
			// when parsing imported modules, which resolves a parser copy peered to the
			// leaf package's tsgo `typescript` (no programmatic API in TS7) and crashes
			// reading `ts.Extension.Cjs`. ESLint deep-merges settings, so we can't drop
			// the key — instead empty its extension list so import-x matches nothing here
			// and falls back to the already-loaded parser object from languageOptions
			// (backed by TS6).
			'import-x/parsers': { '@typescript-eslint/parser': [] },
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
			'@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],

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

			'import-x/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: [
						'**/test/**',
						'**/__tests__/**',
						'**/*.test.ts',
						'**/*.test.utils.ts',
						'**/*.spec.ts',
						'**/integration-tests/**',
						'**/test-utils/**',
						'**/*.config.ts',
						'**/*.config.js',
						'**/scripts/*.ts',
						'**/scripts/*.js',
						'**/*.stories.ts',
					],
					optionalDependencies: false,
				},
			],

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
			'unused-imports/no-unused-imports': 'error',

			/**
			 * https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md
			 *
			 * Set here because 35 packages had each set it for themselves. The
			 * `frontend` and `nodes` layers turn it off: a Vue component, a
			 * composable and a node file all carry a meaningful capital letter.
			 */
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			/** https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-unnecessary-await.md */
			'unicorn/no-unnecessary-await': 'error',

			/** https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-useless-promise-resolve-reject.md */
			'unicorn/no-useless-promise-resolve-reject': 'error',

			'lodash/path-style': ['error', 'as-needed'],
			'lodash/import-scope': ['error', 'method'],

			/**
			 * Rules the repo had already stopped enforcing.
			 *
			 * Each of these was switched off or downgraded in ten or more of the
			 * 72 packages, one config at a time, and every lint script runs with
			 * `--quiet`, so a downgrade to `warn` enforced nothing either. Turning
			 * them off here states that once, instead of in fifty places.
			 *
			 * To enforce one again, set it to `error` in the package that is ready
			 * for it; a local upgrade is allowed and is how `naming-convention`
			 * still runs in twelve packages. Deleting a line from this list is a
			 * repo-wide change and needs the violations fixed first.
			 *
			 * Counted by `scripts/lint-parity/majority.mjs`.
			 */
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'import-x/no-default-export': 'off',
			'import-x/order': 'off',
			'n8n-local-rules/no-uncaught-json-parse': 'off',
			'no-empty': 'off',
		},
	},
	{
		// Rules for unit tests
		files: ['test/**/*.ts', '**/__tests__/*.ts', '**/*.test.ts', '**/*.cy.ts'],
		rules: {
			// Test code casts mocks into position; the rule's assignability check reads
			// those casts as redundant and removing them breaks the build.
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
			'n8n-local-rules/no-skipped-tests': 'error',
			'n8n-local-rules/no-error-instance-in-to-throw': 'error',
			'n8n-local-rules/no-dynamic-regexp': 'off',
		},
	},
);

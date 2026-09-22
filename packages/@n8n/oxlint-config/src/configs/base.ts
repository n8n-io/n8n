import { defineConfig } from 'oxlint';

/**
 * oxlint translation of `@n8n/eslint-config/base`.
 *
 * Every rule below is at `error` in the ESLint layer. Rules the ESLint layer
 * sets to `warn` or `off` are absent: every lint script runs with `--quiet`, so
 * only the error set is enforced. Rules oxlint cannot run are listed in
 * `scripts/lint-parity/oxlint-gap.json` with a reason.
 *
 * Options are the ones the ESLint layer states itself. Where it relies on a
 * preset default, oxlint's own default applies.
 *
 * `categories` is off wholesale and every rule enumerated: oxlint's categories
 * cut across the layer (rules we enable sit in `pedantic`, `restriction` and
 * `style`), so a category both misses rules and adds unrequested ones.
 */
export const baseConfig = defineConfig({
	plugins: ['typescript', 'import', 'unicorn', 'oxc'],
	jsPlugins: [
		'@n8n/eslint-config/plugin',
		'@stylistic/eslint-plugin',
		'eslint-plugin-unused-imports',
		'eslint-plugin-lodash',
	],
	categories: { correctness: 'off' },
	ignorePatterns: [
		'node_modules/**',
		'dist/**',
		'eslint.config.mjs',
		'oxlint.config.mts',
		'tsup.config.ts',
		'vite.config.ts',
		'vitest.config.ts',
	],
	settings: {
		'import-x/extensions': ['.ts', '.tsx', '.cts', '.mts', '.js', '.jsx', '.cjs', '.mjs'],
		'import-x/external-module-folders': ['node_modules', 'node_modules/@types'],
		'import-x/resolver-next': [{ interfaceVersion: 3, name: 'eslint-import-resolver-typescript' }],
	},
	rules: {
		// ----------------------------------
		//              ESLint
		// ----------------------------------
		eqeqeq: 'error',
		'for-direction': 'error',
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
		'no-array-constructor': 'error',
		'no-async-promise-executor': 'error',
		'no-case-declarations': 'error',
		'no-compare-neg-zero': 'error',
		'no-cond-assign': 'error',
		'no-constant-binary-expression': 'error',
		'no-constant-condition': 'error',
		'no-control-regex': 'error',
		'no-debugger': 'error',
		'no-delete-var': 'error',
		'no-dupe-else-if': 'error',
		'no-duplicate-case': 'error',
		'no-empty-character-class': 'error',
		'no-empty-pattern': 'error',
		'no-empty-static-block': 'error',
		'no-ex-assign': 'error',
		'no-extra-boolean-cast': 'error',
		'no-fallthrough': 'error',
		'no-global-assign': 'error',
		'no-invalid-regexp': 'error',
		'no-irregular-whitespace': 'error',
		'no-loss-of-precision': 'error',
		'no-misleading-character-class': 'error',
		'no-nonoctal-decimal-escape': 'error',
		'no-prototype-builtins': 'error',
		'no-regex-spaces': 'error',
		'no-self-assign': 'error',
		'no-shadow-restricted-names': 'error',
		'no-sparse-arrays': 'error',
		'no-unsafe-finally': 'error',
		'no-unsafe-optional-chaining': 'error',
		// oxlint keeps these two in the `eslint` scope, not `typescript`.
		'no-unused-expressions': 'error',
		'no-unused-labels': 'error',
		'no-unused-private-class-members': 'error',
		'no-useless-backreference': 'error',
		'no-useless-catch': 'error',
		'no-useless-escape': 'error',
		'no-var': 'error',
		'no-void': ['error', { allowAsStatement: true }],
		'object-shorthand': 'error',
		'prefer-const': 'error',
		'prefer-rest-params': 'error',
		'require-yield': 'error',
		'use-isnan': 'error',
		'valid-typeof': 'error',

		// ----------------------------------
		//            typescript
		// ----------------------------------
		'typescript/array-type': ['error', { default: 'array-simple' }],
		'typescript/await-thenable': 'error',
		'typescript/ban-ts-comment': ['error', { 'ts-ignore': true }],
		'typescript/consistent-type-assertions': 'error',
		'typescript/consistent-type-exports': 'error',
		'typescript/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
		'typescript/no-array-delete': 'error',
		'typescript/no-base-to-string': 'error',
		'typescript/no-duplicate-enum-values': 'error',
		'typescript/no-duplicate-type-constituents': 'error',
		'typescript/no-explicit-any': 'error',
		'typescript/no-extra-non-null-assertion': 'error',
		'typescript/no-floating-promises': ['error', { ignoreVoid: true }],
		'typescript/no-for-in-array': 'error',
		'typescript/no-implied-eval': 'error',
		'typescript/no-invalid-void-type': 'error',
		'typescript/no-misused-new': 'error',
		'typescript/no-misused-promises': ['error', { checksVoidReturn: false }],
		'typescript/no-non-null-asserted-optional-chain': 'error',
		'typescript/no-redundant-type-constituents': 'error',
		'typescript/no-require-imports': 'error',
		'typescript/no-restricted-types': [
			'error',
			{
				types: {
					Object: { message: 'Use object instead', fixWith: 'object' },
					String: { message: 'Use string instead', fixWith: 'string' },
					Boolean: { message: 'Use boolean instead', fixWith: 'boolean' },
					Number: { message: 'Use number instead', fixWith: 'number' },
					Symbol: { message: 'Use symbol instead', fixWith: 'symbol' },
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
		'typescript/no-this-alias': 'error',
		'typescript/no-unnecessary-boolean-literal-compare': 'error',
		'typescript/no-unnecessary-qualifier': 'error',
		'typescript/no-unnecessary-type-assertion': 'error',
		'typescript/no-unnecessary-type-constraint': 'error',
		'typescript/no-unsafe-declaration-merging': 'error',
		'typescript/no-unsafe-enum-comparison': 'error',
		'typescript/no-unsafe-unary-minus': 'error',
		'typescript/no-wrapper-object-types': 'error',
		'typescript/only-throw-error': 'error',
		'typescript/prefer-as-const': 'error',
		'typescript/prefer-namespace-keyword': 'error',
		'typescript/prefer-promise-reject-errors': 'error',
		'typescript/promise-function-async': 'error',
		'typescript/restrict-plus-operands': 'error',
		'typescript/restrict-template-expressions': 'error',
		'typescript/return-await': ['error', 'always'],

		// ----------------------------------
		//              import
		// ----------------------------------
		'import/no-cycle': ['error', { ignoreExternal: false, maxDepth: 3 }],
		'import/no-duplicates': 'error',

		// ----------------------------------
		//              unicorn
		// ----------------------------------
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		'unicorn/no-unnecessary-await': 'error',
		'unicorn/no-useless-promise-resolve-reject': 'error',

		// ----------------------------------
		//             jsPlugins
		// ----------------------------------
		'@stylistic/member-delimiter-style': [
			'error',
			{
				multiline: { delimiter: 'semi', requireLast: true },
				singleline: { delimiter: 'semi', requireLast: false },
			},
		],
		'lodash/import-scope': ['error', 'method'],
		'lodash/path-style': ['error', 'as-needed'],
		'unused-imports/no-unused-imports': 'error',

		'n8n-local-rules/no-application-error': 'error',
		'n8n-local-rules/no-aws-credential-discovery-imports': 'error',
		'n8n-local-rules/no-internal-package-import': 'error',
		'n8n-local-rules/no-interpolation-in-regular-string': 'error',
		'n8n-local-rules/no-json-parse-json-stringify': 'error',
		'n8n-local-rules/no-restricted-sleep-definition': 'error',
		'n8n-local-rules/no-restricted-sleep-import': 'error',
		'n8n-local-rules/no-type-only-import-in-di': 'error',
		'n8n-local-rules/no-unsealed-workflow-entity-write': 'error',
		'n8n-local-rules/no-unneeded-backticks': 'error',
		'n8n-local-rules/no-unused-param-in-catch-clause': 'error',
		'n8n-local-rules/no-useless-catch-throw': 'error',
	},
	overrides: [
		{
			files: ['test/**/*.ts', '**/__tests__/*.ts', '**/*.test.ts'],
			// An override that names a jsPlugin rule must re-declare the plugin.
			jsPlugins: ['@n8n/eslint-config/plugin'],
			rules: {
				// Test code casts mocks into position; the rule's assignability check reads
				// those casts as redundant and removing them breaks the build.
				'typescript/no-unnecessary-type-assertion': 'off',
				'n8n-local-rules/no-skipped-tests': 'error',
				'n8n-local-rules/no-error-instance-in-to-throw': 'error',
			},
		},
	],
});

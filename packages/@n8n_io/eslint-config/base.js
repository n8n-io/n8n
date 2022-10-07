/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
const config = (module.exports = {
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module',
		project: ['./tsconfig.json'],
	},

	ignorePatterns: [
		'.eslintrc.js', // TODO: remove this
		'node_modules/**',
		'dist/**',
		'test/**', // TODO: remove this
	],

	plugins: [
		/**
		 * Plugin with lint rules for import/export syntax
		 * https://github.com/import-js/eslint-plugin-import
		 */
		'eslint-plugin-import',

		/**
		 * @typescript-eslint/eslint-plugin is required by eslint-config-airbnb-typescript
		 * See step 2: https://github.com/iamturns/eslint-config-airbnb-typescript#2-install-eslint-plugins
		 */
		'@typescript-eslint',

		/**
		 * Plugin to report formatting violations as lint violations
		 * https://github.com/prettier/eslint-plugin-prettier
		 */
		'eslint-plugin-prettier',

		/*
		 * Plugin to allow specifying local ESLint rules.
		 * https://github.com/ivov/eslint-plugin-n8n-local-rules
		 */
		'eslint-plugin-n8n-local-rules',
	],

	extends: [
		/**
		 * Config for typescript-eslint recommended ruleset (without type checking)
		 *
		 * https://github.com/typescript-eslint/typescript-eslint/blob/1c1b572c3000d72cfe665b7afbada0ec415e7855/packages/eslint-plugin/src/configs/recommended.ts
		 */
		'plugin:@typescript-eslint/recommended',

		/**
		 * Config for typescript-eslint recommended ruleset (with type checking)
		 *
		 * https://github.com/typescript-eslint/typescript-eslint/blob/1c1b572c3000d72cfe665b7afbada0ec415e7855/packages/eslint-plugin/src/configs/recommended-requiring-type-checking.ts
		 */
		'plugin:@typescript-eslint/recommended-requiring-type-checking',

		/**
		 * Config for Airbnb style guide for TS, /base to remove React rules
		 *
		 * https://github.com/iamturns/eslint-config-airbnb-typescript
		 * https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-base/rules
		 */
		'eslint-config-airbnb-typescript/base',

		/**
		 * Config to disable ESLint rules covered by Prettier
		 *
		 * https://github.com/prettier/eslint-config-prettier
		 */
		'eslint-config-prettier',
	],

	rules: {
		// ******************************************************************
		//                   required by prettier plugin
		// ******************************************************************

		// The following rule enables eslint-plugin-prettier
		// See: https://github.com/prettier/eslint-plugin-prettier#recommended-configuration

		'prettier/prettier': ['error', { endOfLine: 'auto' }],

		// The following two rules must be disabled when using eslint-plugin-prettier:
		// See: https://github.com/prettier/eslint-plugin-prettier#arrow-body-style-and-prefer-arrow-callback-issue

		/**
		 * https://eslint.org/docs/rules/arrow-body-style
		 */
		'arrow-body-style': 'off',

		/**
		 * https://eslint.org/docs/rules/prefer-arrow-callback
		 */
		'prefer-arrow-callback': 'off',

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

		'no-void': ['error', { allowAsStatement: true }],

		// ----------------------------------
		//        @typescript-eslint
		// ----------------------------------

		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/array-type.md
		 */
		'@typescript-eslint/array-type': ['error', { default: 'array-simple' }],

		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-ts-comment.md
		 */
		'@typescript-eslint/ban-ts-comment': 'off',

		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-types.md
		 */
		'@typescript-eslint/ban-types': [
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
				extendDefaults: false,
			},
		],

		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/consistent-type-assertions.md
		 */
		'@typescript-eslint/consistent-type-assertions': 'error',

		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/explicit-member-accessibility.md
		 */
		'@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],

		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/member-delimiter-style.md
		 */
		'@typescript-eslint/member-delimiter-style': [
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
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/naming-convention.md
		 */
		'@typescript-eslint/naming-convention': [
			'error',
			{
				selector: 'default',
				format: ['camelCase'],
			},
			{
				selector: 'variable',
				format: ['camelCase', 'snake_case', 'UPPER_CASE'],
				leadingUnderscore: 'allowSingleOrDouble',
				trailingUnderscore: 'allowSingleOrDouble',
			},
			{
				selector: 'property',
				format: ['camelCase', 'snake_case'],
				leadingUnderscore: 'allowSingleOrDouble',
				trailingUnderscore: 'allowSingleOrDouble',
			},
			{
				selector: 'typeLike',
				format: ['PascalCase'],
			},
			{
				selector: ['method', 'function'],
				format: ['camelCase'],
				leadingUnderscore: 'allowSingleOrDouble',
			},
		],

		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-duplicate-imports.md
		 */
		'@typescript-eslint/no-duplicate-imports': 'error',

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
		 * https://eslint.org/docs/1.0.0/rules/no-throw-literal
		 */
		'@typescript-eslint/no-throw-literal': 'error',

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
		 * https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unused-vars.md
		 */
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '_' }],

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

		// ----------------------------------
		//       eslint-plugin-import
		// ----------------------------------

		/**
		 * https://github.com/import-js/eslint-plugin-import/blob/master/docs/rules/no-default-export.md
		 */
		'import/no-default-export': 'error',

		/**
		 * https://github.com/import-js/eslint-plugin-import/blob/master/docs/rules/order.md
		 */
		'import/order': 'error',

		// ----------------------------------
		//   eslint-plugin-n8n-local-rules
		// ----------------------------------

		// TODO: set to `error` and fix offenses
		'n8n-local-rules/no-uncaught-json-parse': 'warn',

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
		'prefer-spread': 'error',

		/**
		 * https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/no-unused-vars.md
		 *
		 * Disabled because eslint-plugin-diff fails to catch it. TODO: Revisit.
		 */
		'@typescript-eslint/no-unused-vars': 'warn',

		// ----------------------------------
		//              import
		// ----------------------------------

		/**
		 * https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md
		 */
		'import/prefer-default-export': 'off',
	},
});

if ('ESLINT_PLUGIN_DIFF_COMMIT' in process.env) {
	/**
	 * Plugin to lint only changes
	 *
	 * https://github.com/paleite/eslint-plugin-diff#plugindiffdiff-recommended
	 */
	config.plugins.push('eslint-plugin-diff');

	/**
	 * Config for eslint-plugin-diff
	 *
	 * https://github.com/paleite/eslint-plugin-diff#plugindiffdiff-recommended
	 */
	config.extends.push('plugin:diff/diff');
}

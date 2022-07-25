module.exports = {
	root: true,

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./packages/*/tsconfig.json'],
		sourceType: 'module',
	},
	ignorePatterns: [
		'n8n',
		'.eslintrc.js',
		'**/*.js',
		'**/node_modules/**',
		'**/dist/**',
		'**/test/**',
		'**/templates/**',
		'**/ormconfig.ts',
		'**/migrations/**',
	],

	overrides: [
		{
			files: './packages/*(cli|core|workflow|node-dev)/**/*.ts',
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

				'prettier/prettier': 'error',

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
				'@typescript-eslint/explicit-member-accessibility': [
					'error',
					{ accessibility: 'no-public' },
				],

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

				// ----------------------------------
				//              import
				// ----------------------------------

				/**
				 * https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/prefer-default-export.md
				 */
				'import/prefer-default-export': 'off',
			},
		},
		{
			files: ['./packages/nodes-base/credentials/*.credentials.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			rules: {
				'n8n-nodes-base/cred-class-field-display-name-missing-oauth2': 'error',
				'n8n-nodes-base/cred-class-field-name-missing-oauth2': 'error',
				'n8n-nodes-base/cred-class-field-name-unsuffixed': 'error',
				'n8n-nodes-base/cred-class-field-name-uppercase-first-char': 'error',
				'n8n-nodes-base/cred-class-name-missing-oauth2-suffix': 'error',
				'n8n-nodes-base/cred-class-name-unsuffixed': 'error',
				'n8n-nodes-base/cred-filename-against-convention': 'error',
			},
		},
		{
			files: ['./packages/nodes-base/nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			rules: {
				'n8n-nodes-base/node-class-description-credentials-name-unsuffixed': 'error',
				'n8n-nodes-base/node-class-description-display-name-unsuffixed-trigger-node': 'error',
				'n8n-nodes-base/node-class-description-empty-string': 'error',
				'n8n-nodes-base/node-class-description-icon-not-svg': 'error',
				'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'error',
				'n8n-nodes-base/node-class-description-inputs-wrong-trigger-node': 'error',
				'n8n-nodes-base/node-class-description-missing-subtitle': 'error',
				'n8n-nodes-base/node-class-description-name-unsuffixed-trigger-node': 'error',
				'n8n-nodes-base/node-class-description-outputs-wrong': 'error',
				'n8n-nodes-base/node-dirname-against-convention': 'error',
				'n8n-nodes-base/node-execute-block-double-assertion-for-items': 'error',
				'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'error',
				'n8n-nodes-base/node-filename-against-convention': 'error',
				'n8n-nodes-base/node-param-array-type-assertion': 'error',
				'n8n-nodes-base/node-param-collection-type-unsorted-items': 'error',
				'n8n-nodes-base/node-param-color-type-unused': 'error',
				'n8n-nodes-base/node-param-default-missing': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-boolean': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-collection': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-fixed-collection': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-fixed-collection': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-multi-options': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-number': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-simplify': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-string': 'error',
				'n8n-nodes-base/node-param-description-boolean-without-whether': 'error',
				'n8n-nodes-base/node-param-description-comma-separated-hyphen': 'error',
				'n8n-nodes-base/node-param-description-empty-string': 'error',
				'n8n-nodes-base/node-param-description-excess-final-period': 'error',
				'n8n-nodes-base/node-param-description-excess-inner-whitespace': 'error',
				'n8n-nodes-base/node-param-description-identical-to-display-name': 'error',
				'n8n-nodes-base/node-param-description-line-break-html-tag': 'error',
				'n8n-nodes-base/node-param-description-lowercase-first-char': 'error',
				'n8n-nodes-base/node-param-description-miscased-id': 'error',
				'n8n-nodes-base/node-param-description-miscased-json': 'error',
				'n8n-nodes-base/node-param-description-miscased-url': 'error',
				'n8n-nodes-base/node-param-description-missing-final-period': 'error',
				'n8n-nodes-base/node-param-description-missing-for-ignore-ssl-issues': 'error',
				'n8n-nodes-base/node-param-description-missing-for-return-all': 'error',
				'n8n-nodes-base/node-param-description-missing-for-simplify': 'error',
				'n8n-nodes-base/node-param-description-missing-from-dynamic-multi-options': 'error',
				'n8n-nodes-base/node-param-description-missing-from-dynamic-options': 'error',
				'n8n-nodes-base/node-param-description-missing-from-limit': 'error',
				'n8n-nodes-base/node-param-description-unencoded-angle-brackets': 'error',
				'n8n-nodes-base/node-param-description-unneeded-backticks': 'error',
				'n8n-nodes-base/node-param-description-untrimmed': 'error',
				'n8n-nodes-base/node-param-description-url-missing-protocol': 'error',
				'n8n-nodes-base/node-param-description-weak': 'error',
				'n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options': 'error',
				'n8n-nodes-base/node-param-description-wrong-for-dynamic-options': 'error',
				'n8n-nodes-base/node-param-description-wrong-for-ignore-ssl-issues': 'error',
				'n8n-nodes-base/node-param-description-wrong-for-limit': 'error',
				'n8n-nodes-base/node-param-description-wrong-for-return-all': 'error',
				'n8n-nodes-base/node-param-description-wrong-for-simplify': 'error',
				'n8n-nodes-base/node-param-description-wrong-for-upsert': 'error',
				'n8n-nodes-base/node-param-display-name-excess-inner-whitespace': 'error',
				'n8n-nodes-base/node-param-display-name-miscased': 'error',
				'n8n-nodes-base/node-param-display-name-miscased-id': 'error',
				'n8n-nodes-base/node-param-display-name-untrimmed': 'error',
				'n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options': 'error',
				'n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options': 'error',
				'n8n-nodes-base/node-param-display-name-wrong-for-simplify': 'error',
				'n8n-nodes-base/node-param-display-name-wrong-for-update-fields': 'error',
				'n8n-nodes-base/node-param-min-value-wrong-for-limit': 'error',
				'n8n-nodes-base/node-param-multi-options-type-unsorted-items': 'error',
				'n8n-nodes-base/node-param-operation-without-no-data-expression': 'error',
				'n8n-nodes-base/node-param-operation-option-without-action': 'error',
				'n8n-nodes-base/node-param-option-description-identical-to-name': 'error',
				'n8n-nodes-base/node-param-option-name-containing-star': 'error',
				'n8n-nodes-base/node-param-option-name-duplicate': 'error',
				'n8n-nodes-base/node-param-option-name-wrong-for-get-all': 'error',
				'n8n-nodes-base/node-param-option-name-wrong-for-upsert': 'error',
				'n8n-nodes-base/node-param-option-value-duplicate': 'error',
				'n8n-nodes-base/node-param-options-type-unsorted-items': 'error',
				'n8n-nodes-base/node-param-placeholder-miscased-id': 'error',
				'n8n-nodes-base/node-param-placeholder-missing-email': 'error',
				'n8n-nodes-base/node-param-required-false': 'error',
				'n8n-nodes-base/node-param-resource-with-plural-option': 'error',
				'n8n-nodes-base/node-param-resource-without-no-data-expression': 'error',
				'n8n-nodes-base/node-param-type-options-missing-from-limit': 'error',
			},
		},
	],
};

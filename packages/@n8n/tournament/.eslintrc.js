/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	parser: '@typescript-eslint/parser',

	parserOptions: {
		tsconfigRootDir: __dirname,
		project: ['./tsconfig.json'],
	},

	ignorePatterns: ['node_modules/**', 'dist/**', '*.js'],

	plugins: [
		'@typescript-eslint',
		'eslint-plugin-prettier',
		'eslint-plugin-import',
		'unused-imports',
		'eslint-plugin-unicorn',
	],

	extends: [
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'eslint-config-airbnb-typescript/base',
		'eslint-config-prettier',
	],

	rules: {
		// eslint

		'arrow-body-style': 'off',
		'class-methods-use-this': 'off',
		'no-plusplus': 'off',
		'no-unused-vars': 'off',
		'no-void': ['error', { allowAsStatement: true }],
		'object-shorthand': 'error',
		'prefer-arrow-callback': 'off',
		'prefer-const': 'error',
		'prefer-spread': 'error',
		eqeqeq: 'error',

		// import

		'import/no-cycle': 'error',
		'import/no-default-export': 'error',
		'import/order': 'error',

		// @typescript-eslint

		'@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
		'@typescript-eslint/consistent-type-assertions': 'error',
		'@typescript-eslint/consistent-type-imports': 'error',
		'@typescript-eslint/no-duplicate-imports': 'error',
		'@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
		'@typescript-eslint/no-invalid-void-type': 'error',
		'@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
		'@typescript-eslint/no-namespace': 'off',
		'@typescript-eslint/no-throw-literal': 'error',
		'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
		'@typescript-eslint/no-unnecessary-qualifier': 'error',
		'@typescript-eslint/no-unused-expressions': 'error',
		'@typescript-eslint/prefer-nullish-coalescing': 'error',
		'@typescript-eslint/prefer-optional-chain': 'error',
		'@typescript-eslint/promise-function-async': 'error',
		'@typescript-eslint/triple-slash-reference': 'off',
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

		'@typescript-eslint/no-unused-vars': [
			process.env.CI_LINT_MASTER ? 'warn' : 'error',
			{
				argsIgnorePattern: '^_',
				destructuredArrayIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			},
		],
		'no-restricted-syntax': [
			'error',
			{
				selector: 'TSEnumDeclaration:not([const=true])',
				message:
					'Do not declare raw enums as it leads to runtime overhead. Use const enum instead. See https://www.typescriptlang.org/docs/handbook/enums.html#const-enums',
			},
		],

		// prettier

		'prettier/prettier': ['error', { endOfLine: 'auto' }],

		// unused imports

		'unused-imports/no-unused-imports': process.env.NODE_ENV === 'development' ? 'warn' : 'error',

		// unicorn

		'unicorn/no-unnecessary-await': 'error',
		'unicorn/no-useless-promise-resolve-reject': 'error',

		// ===============
		//    disabled
		// ===============

		'@typescript-eslint/ban-types': 'off',
		'@typescript-eslint/no-duplicate-imports': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-implied-eval': 'off',
		'@typescript-eslint/no-loop-func': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'@typescript-eslint/no-use-before-define': 'off',
		'@typescript-eslint/prefer-nullish-coalescing': 'off',
		indent: 'off',
		'import/extensions': 'off',
		'sort-imports': 'off',
	},
};

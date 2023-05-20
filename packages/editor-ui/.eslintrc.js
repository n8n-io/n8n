const { sharedOptions } = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/frontend'],

	...sharedOptions(__dirname, 'frontend'),

	rules: {
		// TODO: Remove these
		'id-denylist': 'off',
		'import/extensions': 'off',
		'import/no-default-export': 'off',
		'import/no-extraneous-dependencies': 'off',
		'import/order': 'off',
		'import/no-cycle': 'warn',
		indent: 'off',
		'@typescript-eslint/ban-types': 'off',
		'@typescript-eslint/dot-notation': 'off',
		'@typescript-eslint/lines-between-class-members': 'off',
		'@typescript-eslint/member-delimiter-style': 'off',
		'@typescript-eslint/naming-convention': 'off',
		'@typescript-eslint/no-duplicate-imports': 'off',
		'@typescript-eslint/no-empty-interface': 'off',
		'@typescript-eslint/no-for-in-array': 'off',
		'@typescript-eslint/no-loop-func': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'@typescript-eslint/no-shadow': 'off',
		'@typescript-eslint/no-this-alias': 'off',
		'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
		'@typescript-eslint/no-unnecessary-type-assertion': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'@typescript-eslint/no-unused-expressions': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/no-use-before-define': 'off',
		'@typescript-eslint/no-var-requires': 'off',
		'@typescript-eslint/prefer-nullish-coalescing': 'off',
		'@typescript-eslint/prefer-optional-chain': 'off',
		'@typescript-eslint/restrict-plus-operands': 'off',
		'@typescript-eslint/restrict-template-expressions': 'off',
		'@typescript-eslint/unbound-method': 'off',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
	},
};

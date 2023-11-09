const sharedOptions = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/frontend'],

	...sharedOptions(__dirname, 'frontend'),

	rules: {
		// TODO: Remove these
		'id-denylist': 'warn',
		'import/extensions': 'warn',
		'import/no-default-export': 'warn',
		'import/no-extraneous-dependencies': 'warn',
		'import/order': 'off',
		'import/no-cycle': 'warn',
		'import/no-duplicates': 'warn',
		'@typescript-eslint/ban-types': 'warn',
		'@typescript-eslint/dot-notation': 'warn',
		'@typescript-eslint/lines-between-class-members': 'warn',
		'@typescript-eslint/member-delimiter-style': 'warn',
		'@typescript-eslint/naming-convention': 'warn',
		'@typescript-eslint/no-empty-interface': 'warn',
		'@typescript-eslint/no-for-in-array': 'warn',
		'@typescript-eslint/no-loop-func': 'warn',
		'@typescript-eslint/no-non-null-assertion': 'warn',
		'@typescript-eslint/no-shadow': 'warn',
		'@typescript-eslint/no-this-alias': 'warn',
		'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
		'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/no-unused-expressions': 'warn',
		'@typescript-eslint/no-unused-vars': 'warn',
		'@typescript-eslint/no-use-before-define': 'warn',
		'@typescript-eslint/no-var-requires': 'warn',
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
		'@typescript-eslint/prefer-optional-chain': 'warn',
		'@typescript-eslint/restrict-plus-operands': 'warn',
		'@typescript-eslint/restrict-template-expressions': 'warn',
		'@typescript-eslint/unbound-method': 'warn',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
		'@typescript-eslint/no-redundant-type-constituents': 'warn',
		'@typescript-eslint/no-base-to-string': 'warn',
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-unsafe-enum-comparison': 'warn',
	},
};

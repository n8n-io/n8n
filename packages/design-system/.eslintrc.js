/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/frontend'],

	parserOptions: {
		project: ['./tsconfig.json'],
	},

	rules: {
		// TODO: Remove these
		'import/no-default-export': 'off',
		'import/no-extraneous-dependencies': 'off',
		'import/order': 'off',
		'prettier/prettier': 'off',
		'@typescript-eslint/member-delimiter-style': 'off',
		'@typescript-eslint/naming-convention': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/prefer-nullish-coalescing': 'off',
		'@typescript-eslint/prefer-optional-chain': 'off',
		'@typescript-eslint/restrict-template-expressions': 'off',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
	}
};

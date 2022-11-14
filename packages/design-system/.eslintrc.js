/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/frontend'],

	parserOptions: {
		project: ['./tsconfig.json'],
		tsconfigRootDir: __dirname,
		extraFileExtensions: ['.vue'],
	},

	rules: {
		// TODO: Remove these
		'import/no-default-export': 'off',
		'import/no-extraneous-dependencies': 'off',
		'import/order': 'off',
		'prettier/prettier': 'off',
		'@typescript-eslint/member-delimiter-style': 'off',
		'@typescript-eslint/naming-convention': 'off',
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/no-unused-vars': 'warn',
		'@typescript-eslint/restrict-template-expressions': 'off',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
	}
};

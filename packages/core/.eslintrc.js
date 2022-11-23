/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],

	parserOptions: {
		project: ['./tsconfig.json'],
		tsconfigRootDir: __dirname,
	},

	ignorePatterns: ['bin/*.js'],

	rules: {
		// TODO: Remove this
		'import/order': 'off',
		'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
	},
};

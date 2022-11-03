/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],
	ignorePatterns: [
		'jest.config.js',
		// TODO: Remove these
		'src/databases/migrations/**',
	],
	rules: {
		// TODO: Remove this
		'import/order': 'off',
		'import/extensions': 'off',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
	},
};

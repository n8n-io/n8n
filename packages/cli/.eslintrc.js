/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],
	ignorePatterns: [
		'jest.config.js',
		// TODO: Remove these
		'src/databases/migrations/**',
		'src/databases/ormconfig.ts',
	],
	rules: {
		// TODO: Remove this
		'import/order': 'off',
	},
 };

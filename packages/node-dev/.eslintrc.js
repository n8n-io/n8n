/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/base'],
	ignorePatterns: [
		'templates/**', // TODO: remove this
	],
	rules: {
		'import/order': 'off', // TODO: remove this
	},
};

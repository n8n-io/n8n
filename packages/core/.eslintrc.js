const { sharedOptions } = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],

	...sharedOptions(__dirname),

	ignorePatterns: ['bin/*.js'],

	rules: {
		// TODO: Remove this
		'import/order': 'off',
		'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
	},
};

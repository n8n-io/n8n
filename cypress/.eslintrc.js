const { sharedOptions } = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/cypress'],

	...sharedOptions(__dirname),

	rules: {
		// TODO: Remove this
		'cypress/no-unnecessary-waiting': 'warn',
		'cypress/no-assigning-return-values': 'warn',
	},
};

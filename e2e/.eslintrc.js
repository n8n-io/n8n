const { sharedOptions } = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/base'],

	...sharedOptions(__dirname),

	ignorePatterns: ['.eslintrc.js'],

	plugins: ['eslint-plugin-cypress'],

	extends: ['plugin:cypress/recommended'],

	rules: {
		// TODO: Remove this
		'cypress/no-unnecessary-waiting': 'warn',
		'cypress/no-assigning-return-values': 'warn',
	},
};

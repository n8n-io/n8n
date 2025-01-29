const sharedOptions = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/base'],

	...sharedOptions(__dirname),

	rules: {
		'@typescript-eslint/consistent-type-imports': 'error',
		'n8n-local-rules/no-plain-errors': 'off',
		'n8n-local-rules/no-uncaught-json-parse': 'off',
	},
};

const sharedOptions = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],

	...sharedOptions(__dirname),

	overrides: [
		{
			files: ['**/*.config.ts'],
			rules: {
				'n8n-local-rules/no-untyped-config-class-field': 'error',
			},
		},
	],
};

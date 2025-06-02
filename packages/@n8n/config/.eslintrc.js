const sharedOptions = require('@n8n/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n/eslint-config/node'],

	...sharedOptions(__dirname),

	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
	},

	overrides: [
		{
			files: ['**/*.config.ts'],
			rules: {
				'n8n-local-rules/no-untyped-config-class-field': 'error',
			},
		},
	],
};

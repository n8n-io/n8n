const sharedOptions = require('@n8n/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n/eslint-config/base'],

	...sharedOptions(__dirname),

	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		'@typescript-eslint/consistent-type-imports': 'error',
		'n8n-local-rules/no-plain-errors': 'off',
	},
};

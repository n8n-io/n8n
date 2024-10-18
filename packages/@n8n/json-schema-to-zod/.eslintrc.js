const sharedOptions = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],

	...sharedOptions(__dirname),

	ignorePatterns: ['jest.config.js'],

	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		'@typescript-eslint/no-duplicate-imports': 'off',
		'import/no-cycle': 'off',
		'n8n-local-rules/no-plain-errors': 'off',

		complexity: 'error',
	},
};

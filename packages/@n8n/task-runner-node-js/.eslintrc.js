const sharedOptions = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],

	...sharedOptions(__dirname),

	parserOptions: {
		project: './tsconfig.json',
	},

	ignorePatterns: ['jest.config.js'],

	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],

		complexity: 'error',
	},
};

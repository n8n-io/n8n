const sharedOptions = require('@n8n/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n/eslint-config/node'],

	...sharedOptions(__dirname),

	parserOptions: {
		project: './tsconfig.json',
	},

	ignorePatterns: ['bin/*.js'],

	rules: {
		complexity: 'error',
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],

		// TODO: Remove this
		'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true }],
	},
};

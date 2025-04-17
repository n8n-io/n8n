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

	ignorePatterns: ['scenarios/**'],

	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		'n8n-local-rules/no-plain-errors': 'off',
		complexity: 'error',
	},

	overrides: [
		{
			files: ['./src/commands/*.ts'],
			rules: {
				'import/no-default-export': 'off',
			},
		},
	],
};

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

	ignorePatterns: ['scenarios/**', 'scripts/**'],

	rules: {
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

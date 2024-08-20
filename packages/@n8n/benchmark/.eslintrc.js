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

	ignorePatterns: ['scenarios/**'],

	rules: {
		'n8n-local-rules/no-plain-errors': 'off',
		'n8n-local-rules/no-uncaught-json-parse': 'off',
		'n8n-local-rules/no-dynamic-import-template': 'error',
		'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
		'n8n-local-rules/no-type-unsafe-event-emitter': 'error',
		complexity: 'error',

		'import/order': 'off',
		'import/extensions': 'warn',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-base-to-string': 'warn',
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
		'@typescript-eslint/no-redundant-type-constituents': 'warn',
		'@typescript-eslint/ban-types': 'warn',
		'@typescript-eslint/no-unsafe-enum-comparison': 'warn',
		'@typescript-eslint/no-unsafe-declaration-merging': 'warn',
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

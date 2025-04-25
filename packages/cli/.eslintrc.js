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

	ignorePatterns: [
		'jest.config.js',
		// TODO: Remove these
		'src/databases/ormconfig.ts',
	],

	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],

		'n8n-local-rules/no-dynamic-import-template': 'error',
		'n8n-local-rules/misplaced-n8n-typeorm-import': 'error',
		'n8n-local-rules/no-type-unsafe-event-emitter': 'error',
		complexity: 'error',

		// TODO: Remove this
		'import/no-cycle': 'warn',
		'import/extensions': 'warn',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-base-to-string': 'warn',
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
		'@typescript-eslint/no-redundant-type-constituents': 'warn',
		'@typescript-eslint/no-restricted-types': 'warn',
		'@typescript-eslint/no-unsafe-enum-comparison': 'warn',
		'@typescript-eslint/no-unsafe-declaration-merging': 'warn',
	},

	overrides: [],
};

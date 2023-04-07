const { sharedOptions } = require('@n8n_io/eslint-config/shared');

/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],

	...sharedOptions(__dirname),

	ignorePatterns: [
		'jest.config.js',
		// TODO: Remove these
		'src/databases/migrations/**',
		'src/databases/ormconfig.ts',
	],

	rules: {
		'@typescript-eslint/consistent-type-imports': 'error',

		// TODO: Remove this
		'import/no-cycle': 'warn',
		'import/order': 'off',
		'import/extensions': 'off',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
		'no-restricted-syntax': [
			'error',
			{
				selector: 'TSEnumDeclaration:not([const=true])',
				message:
					'Do not declare raw enums as it lead to runtime overhead. Use const enum instead. See https://www.typescriptlang.org/docs/handbook/enums.html#const-',
			},
		],
	},
};

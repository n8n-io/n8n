/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/node'],
	ignorePatterns: [
		'jest.config.js',
		// TODO: Remove these
		'src/databases/migrations/**',
		'src/databases/ormconfig.ts',
	],
	rules: {
		// TODO: Remove this
		'import/order': 'off',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{
				argsIgnorePattern: '^_',
				destructuredArrayIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			},
		],
	},
};

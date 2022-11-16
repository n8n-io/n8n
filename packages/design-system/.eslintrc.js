/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	extends: ['@n8n_io/eslint-config/frontend'],

	parserOptions: {
		project: ['./tsconfig.json'],
		tsconfigRootDir: __dirname,
		extraFileExtensions: ['.vue'],
	},

	rules: {
		// TODO: Remove these
		'import/no-default-export': 'off',
		'import/order': 'off',
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
	},

	overrides: [
		{
			files: ['src/**/*.stories.{js,ts}'],
			rules: {
				'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
			},
		},
		{
			files: ['src/**/*.stories.{js,ts}', 'src/**/*.vue', 'src/**/*.spec.ts'],
			rules: {
				'@typescript-eslint/naming-convention': [
					'warn',
					{
						selector: ['variable', 'property'],
						format: ['PascalCase', 'camelCase', 'UPPER_CASE'],
					},
				],
			},
		},
		{
			files: ['src/components/N8nFormInput/validators.ts'],
			rules: {
				'@typescript-eslint/naming-convention': [
					'error',
					{
						selector: ['property'],
						format: ['camelCase', 'UPPER_CASE'],
					},
				],
			},
		},
	],
};

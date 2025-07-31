import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importX from 'eslint-plugin-import-x';

export default [
	{
		ignores: [
			'scripts/**/*.mjs',
			'dist/**',
			'coverage/**',
			'node_modules/**',
			'eslint.config.*', // ESLint config files can use default exports
		],
	},
	{
		files: ['**/*.js', '**/*.mjs'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
		plugins: {
			'import-x': importX,
		},
		rules: {
			// Basic rules that don't require plugins
			'no-console': 'warn',
			'no-debugger': 'error',
			'no-ex-assign': 'warn',
			'no-case-declarations': 'warn',
			'no-fallthrough': 'warn',
			'no-unsafe-optional-chaining': 'warn',
			'no-empty': 'warn',
			'no-async-promise-executor': 'warn',
			'no-useless-escape': 'warn',
			'prefer-const': 'warn',
			complexity: 'warn',
			// Import/export rules
			'import-x/no-default-export': 'warn',
			'import-x/no-cycle': 'warn',
		},
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2022,
			sourceType: 'module',
		},
		plugins: {
			'@typescript-eslint': typescriptEslint,
			'import-x': importX,
		},
		rules: {
			// Basic rules that don't require plugins
			'no-console': 'warn',
			'no-debugger': 'error',
			'no-ex-assign': 'warn',
			'no-case-declarations': 'warn',
			'no-fallthrough': 'warn',
			'no-unsafe-optional-chaining': 'warn',
			'no-empty': 'warn',
			'no-async-promise-executor': 'warn',
			'no-useless-escape': 'warn',
			'prefer-const': 'warn',
			complexity: 'warn',
			// Import/export rules
			'import-x/no-default-export': 'warn',
			'import-x/no-cycle': 'warn',
			// Disable n8n-local-rules until they are properly configured
			'n8n-local-rules/misplaced-n8n-typeorm-import': 'off',
			'n8n-local-rules/no-type-unsafe-event-emitter': 'off',
		},
	},
];

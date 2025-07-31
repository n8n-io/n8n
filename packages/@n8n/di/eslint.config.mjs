import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import unicornPlugin from 'eslint-plugin-unicorn';
import importPlugin from 'eslint-plugin-import-x';

export default tseslint.config(
	globalIgnores([
		'node_modules/**',
		'dist/**',
		'eslint.config.mjs',
		'jest.config.js', // Ignore Jest config file
	]),
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.typescript,
	{
		plugins: {
			unicorn: unicornPlugin,
		},
		languageOptions: {
			ecmaVersion: 2024,
			globals: globals.node,
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			// Allow unused type parameters in overload signatures
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					varsIgnorePattern: '^_',
					argsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
				},
			],

			// TODO: Remove this
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-unsafe-function-type': 'warn',
			'import-x/order': 'warn',
		},
	},
);

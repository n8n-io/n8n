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

			// TODO: Remove this
			'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/no-floating-promises': 'warn',
			'import-x/order': 'warn',
		},
	},
);

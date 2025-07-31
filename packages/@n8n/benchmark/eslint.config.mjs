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
		'scenarios/**',
		'scripts/**',
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
			complexity: 'error',
			'@typescript-eslint/naming-convention': 'warn',
			'no-empty': 'warn',
		},
	},
	{
		files: ['./src/commands/*.ts'],
		rules: {
			'import-x/no-default-export': 'off',
		},
	},
);

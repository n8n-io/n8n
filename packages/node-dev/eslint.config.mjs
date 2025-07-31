import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import unicornPlugin from 'eslint-plugin-unicorn';

export default tseslint.config(
	globalIgnores([
		'node_modules/**',
		'dist/**',
		'eslint.config.mjs',
	]),
	eslint.configs.recommended,
	...tseslint.configs.recommended,
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
			'unicorn/filename-case': ['warn', { case: 'kebabCase' }], // Warn instead of error

			// TODO: Remove this
			'@typescript-eslint/naming-convention': 'warn',
		},
	},
);

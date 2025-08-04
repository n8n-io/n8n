import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';

export default tseslint.config(
	globalIgnores([
		'node_modules/**',
		'dist/**',
		'coverage/**',
		'eslint.config.mjs',
		'jest.config.js',
		'src/expressions/grammar*.ts',
	]),
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2024,
			globals: globals.node,
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			// TODO: Remove this
			'@typescript-eslint/naming-convention': 'warn',
			'no-useless-escape': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
		},
	},
);

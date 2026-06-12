import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

// TODO will be cleaned up after the http unification. See CAT-3390
export default defineConfig(
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		files: ['src/http/**/*.ts'],
		rules: {
			'no-prototype-builtins': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/require-await': 'warn',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'n8n-local-rules/no-uncaught-json-parse': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
		},
	},
);

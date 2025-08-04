import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			// TODO: Remove this
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-function-type': 'warn',
			'@typescript-eslint/no-empty-object-type': 'warn',
			'@typescript-eslint/no-restricted-types': 'warn',
			'no-useless-escape': 'warn',
			'no-empty': 'warn',
		},
	},
	{
		files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-return': 'warn',
		},
	},
	{
		files: ['./src/migrations/**/*.ts'],
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
);

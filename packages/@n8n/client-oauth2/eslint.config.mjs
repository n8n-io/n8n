import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			'@typescript-eslint/consistent-type-imports': 'error',
			'n8n-local-rules/no-plain-errors': 'off',
			'n8n-local-rules/no-uncaught-json-parse': 'off',

			// TODO: Remove this
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/require-await': 'warn',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			// TODO: Remove this
			'id-denylist': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
		},
	},
);

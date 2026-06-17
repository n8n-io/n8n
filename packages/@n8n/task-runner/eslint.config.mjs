import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			complexity: 'error',

			// TODO: Remove this
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-require-imports': 'warn',
			'@typescript-eslint/require-await': 'warn',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'n8n-local-rules/no-uncaught-json-parse': 'warn',
			'import-x/no-duplicates': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
		},
	},
);

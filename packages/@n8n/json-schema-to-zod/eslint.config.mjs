import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(
	nodeConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			'@typescript-eslint/no-duplicate-imports': 'off',
			'import-x/no-cycle': 'off',
			complexity: 'error',

			// TODO: Remove this
			'no-constant-condition': 'warn',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
		},
	},
);

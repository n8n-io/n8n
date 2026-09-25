import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		rules: {
			'@typescript-eslint/no-restricted-types': 'off',
			'@typescript-eslint/no-implied-eval': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		// Debt: the base layer enforces kebab-case filenames and this package has
		// 12 files that predate it. Rename them, then delete this block.
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
);

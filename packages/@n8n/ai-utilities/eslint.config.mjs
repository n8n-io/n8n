import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	backendConfig,
	globalIgnores(['scripts/**']),
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'no-case-declarations': 'warn',
		},
	},
	{
		// Debt: the base layer enforces kebab-case filenames and this package has
		// 31 files that predate it. Rename them, then delete this block.
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
);

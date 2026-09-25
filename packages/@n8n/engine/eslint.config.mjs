import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	{ ignores: ['compiled/**', 'vitest.integration.config.ts'] },
	backendConfig,
	{
		// Debt: the base layer enforces kebab-case filenames and this package has
		// 2 files that predate it. Rename them, then delete this block.
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
);

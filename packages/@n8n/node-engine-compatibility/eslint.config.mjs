import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	{ ignores: ['dist/**', 'vitest.integration.config.ts'] },
	backendConfig,
	{
		files: ['src/__tests__/**'],
		rules: {
			// Workflow fixtures key connections by node name, e.g. "When clicking Execute"
			'@typescript-eslint/naming-convention': 'off',
		},
	},
);

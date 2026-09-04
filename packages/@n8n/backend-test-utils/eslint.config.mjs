import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';
import { encryptionBoundaryConfig } from '@n8n/eslint-config/encryption-boundary';

export default defineConfig(
	baseConfig,
	// Depends on @n8n/db, so the encryption guardrails must run here even
	// though it is not on nodeConfig.
	encryptionBoundaryConfig,
	{
		rules: {
			// TODO: Remove this
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
		},
	},
);

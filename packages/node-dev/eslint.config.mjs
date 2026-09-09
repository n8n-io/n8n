import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';
import { encryptionBoundaryConfig } from '@n8n/eslint-config/encryption-boundary';

export default defineConfig(
	baseConfig,
	// Depends on n8n-core, so the encryption guardrails must run here even
	// though it is not on nodeConfig.
	encryptionBoundaryConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],

			// TODO: Remove this
			'unicorn/filename-case': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
		},
	},
);

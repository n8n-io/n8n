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

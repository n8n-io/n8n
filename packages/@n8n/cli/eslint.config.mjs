import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(
	baseConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			// oclif requires default exports for command classes
			'import-x/no-default-export': 'off',
			// This is a standalone CLI — no n8n-workflow dependency available
			'n8n-local-rules/no-uncaught-json-parse': 'off',
		},
	},
	{
		// The oclif command registry requires colon-separated keys (e.g. 'workflow:list')
		// The HTTP client uses standard header names (X-N8N-API-KEY, Content-Type)
		files: ['src/index.ts', 'src/client.ts', 'src/commands/login.ts'],
		rules: {
			'@typescript-eslint/naming-convention': 'off',
		},
	},
);

import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

const AI_SDK_LAZY_IMPORT_MESSAGE =
	"Import runtime values from 'ai' through the lazy loader in src/runtime/lazy-ai.ts or a dynamic import at the call site, so @n8n/agents stays light at boot.";

export default defineConfig(
	{
		ignores: [
			'examples/**',
			'vitest.integration.config.*',
			'vitest.integration.setup.ts',
			'src/__tests__/fixtures/**',
		],
	},
	backendConfig,
	{
		files: ['src/**/*.ts'],
		ignores: ['src/**/__tests__/**/*.ts'],
		rules: {
			'n8n-local-rules/no-static-runtime-import': [
				'error',
				{
					paths: [
						{
							name: 'ai',
							message: AI_SDK_LAZY_IMPORT_MESSAGE,
						},
					],
				},
			],
		},
	},
	{
		files: ['src/__tests__/integration/**/*.ts'],
		rules: {
			'@typescript-eslint/require-await': 'off',
			'n8n-local-rules/no-uncaught-json-parse': 'off',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
		},
	},
);

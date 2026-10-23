import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

const AI_SDK_LAZY_IMPORT_MESSAGE =
	"Import runtime values from 'ai' through the lazy loader in src/runtime/lazy-ai.ts or a dynamic import at the call site, so @n8n/agents stays light at boot.";

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: [
		'examples/**',
		'vitest.integration.config.*',
		'vitest.integration.setup.ts',
		'src/__tests__/fixtures/**',
	],
	overrides: [
		{
			files: ['src/**/*.ts'],
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
			files: ['src/**/__tests__/**/*.ts'],
			rules: { 'n8n-local-rules/no-static-runtime-import': 'off' },
		},
		{
			files: ['src/__tests__/integration/**/*.ts'],
			rules: {
				'typescript/require-await': 'off',
				'n8n-local-rules/no-uncaught-json-parse': 'off',
			},
		},
	],
});

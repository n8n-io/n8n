import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

const AI_SDK_LAZY_IMPORT_MESSAGE =
	"Import runtime values from 'ai' through the lazy loader in src/runtime/lazy-ai.ts or a dynamic import at the call site, so @n8n/agents stays light at boot.";

export default defineConfig(
	{ ignores: ['examples/**', 'vitest.integration.config.*', 'src/__tests__/fixtures/**'] },
	nodeConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'enumMember',
					format: ['UPPER_CASE', 'PascalCase'],
				},
			],
		},
	},
	{
		files: ['src/**/*.ts'],
		ignores: ['src/**/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'ai',
							allowTypeImports: true,
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

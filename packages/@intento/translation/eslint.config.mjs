import { defineConfig, globalIgnores } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(
	nodeConfig,
	globalIgnores(['bin/*.js', 'nodes-testing/*.ts', 'coverage/*']),
	{
		rules: {
			complexity: ['error', 15],
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		files: ['**/*.test.ts', '**/test/**/*.ts', '**/__test__/**/*.ts', '**/__tests__/**/*.ts'],
		rules: {},
	},
);

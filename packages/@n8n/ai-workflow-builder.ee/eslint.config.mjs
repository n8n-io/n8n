import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig, {
	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		complexity: 'error',
		'@typescript-eslint/require-await': 'warn',
		'@typescript-eslint/naming-convention': 'warn',
	},
}, {
	files: ['./src/test/**/*.ts', './**/*.test.ts'],
	rules: {
		'@typescript-eslint/no-unsafe-assignment': 'warn',
	},
});

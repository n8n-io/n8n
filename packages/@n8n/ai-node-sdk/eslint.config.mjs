import { defineConfig, globalIgnores } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig, globalIgnores(['dist/**']), {
	rules: {
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/naming-convention': 'warn',
	},
});

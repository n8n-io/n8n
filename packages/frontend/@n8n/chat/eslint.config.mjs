import { frontendConfig } from '@n8n/eslint-config/frontend';
import { defineConfig } from 'eslint/config';

export default defineConfig(frontendConfig, {
	rules: {
		// TODO: Remove these
		'no-empty': 'warn',
		'@typescript-eslint/require-await': 'warn',
		'@typescript-eslint/no-empty-object-type': 'warn',
		'@typescript-eslint/naming-convention': 'warn',
		'@typescript-eslint/no-unsafe-function-type': 'warn',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/no-unsafe-assignment': 'warn',
	},
});

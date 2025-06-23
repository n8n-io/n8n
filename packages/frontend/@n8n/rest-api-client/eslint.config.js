import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	rules: {
		// TODO: Remove these
		'@typescript-eslint/naming-convention': 'warn',
		'@typescript-eslint/no-empty-object-type': 'warn',
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
	},
});

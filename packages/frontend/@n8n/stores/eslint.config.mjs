import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	rules: {
		'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
	},
});

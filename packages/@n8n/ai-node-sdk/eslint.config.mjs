import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(backendConfig, globalIgnores(['dist/**']), {
	rules: {
		'@typescript-eslint/no-explicit-any': 'warn',
	},
});

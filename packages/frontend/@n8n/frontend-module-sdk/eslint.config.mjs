import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	files: ['**/*.test.ts'],
	rules: { '@typescript-eslint/no-unsafe-assignment': 'warn' },
});

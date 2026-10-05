import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig({ ignores: ['dist/**', 'vitest.config.ts'] }, frontendConfig, {
	// The command line tool reports progress on the console.
	files: ['src/cli/**/*.ts'],
	rules: { 'no-console': 'off' },
});

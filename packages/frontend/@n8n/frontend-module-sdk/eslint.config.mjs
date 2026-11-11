import { defineConfig } from 'eslint/config';
import { frontendOxlintResidualConfig } from '@n8n/eslint-config/frontend-oxlint-residual';

export default defineConfig(frontendOxlintResidualConfig, {
	files: ['**/*.test.ts'],
	rules: { '@typescript-eslint/no-unsafe-assignment': 'warn' },
});

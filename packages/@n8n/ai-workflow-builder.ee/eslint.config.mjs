import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	globalIgnores(['coverage/**', 'vitest.config.*.ts', 'evaluations/programmatic/python/.venv/**']),
	backendConfig,
	{
		rules: {
			complexity: 'error',
		},
	},
	{
		files: ['./src/test/**/*.ts', './**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'warn',
		},
	},
	{
		// The eval harness is dev-only tooling (excluded from the build output),
		// so devDependencies (e.g. n8n-core for __schema__ resolution) are fine.
		files: ['./evaluations/**/*.ts'],
		rules: {
			'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
		},
	},
);

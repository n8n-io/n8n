import { defineConfig, globalIgnores } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(
	globalIgnores([
		'coverage/**',
		'vitest.config.*.ts',
		'evaluations/programmatic/python/.venv/**',
	]),
	nodeConfig,
	{
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
}, {
	// The eval harness is dev-only tooling (excluded from the build output),
	// so devDependencies (e.g. n8n-core for __schema__ resolution) are fine.
	files: ['./evaluations/**/*.ts'],
	rules: {
		'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
	},
});

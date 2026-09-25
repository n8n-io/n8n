import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	globalIgnores(['src/template/templates/**/template', 'src/template/templates/shared']),
	backendConfig,
	{
		files: ['**/*.test.ts', 'src/test-utils/**/*'],
		rules: {
			'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
		},
	},
	{
		files: ['src/commands/**/*.ts', 'src/modules.d.ts', 'src/configs/eslint.ts'],
		rules: { 'import-x/no-default-export': 'off', '@typescript-eslint/naming-convention': 'off' },
	},
	{
		// Debt: the base layer enforces kebab-case filenames and this package has
		// 22 files that predate it. Rename them, then delete this block.
		rules: {
			'unicorn/filename-case': 'off',
		},
	},
);

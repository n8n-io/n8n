import { defineConfig, globalIgnores } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(
	globalIgnores(['src/template/templates/**/template', 'src/template/templates/shared']),
	nodeConfig,
	{
		files: ['src/commands/**/*.ts', 'src/modules.d.ts', 'src/configs/eslint.ts'],
		rules: { 'import-x/no-default-export': 'off', '@typescript-eslint/naming-convention': 'off' },
	},
);

import { defineConfig, globalIgnores } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(globalIgnores(['src/templates']), nodeConfig, {
	files: ['src/commands/*.ts', 'src/index.d.ts', 'src/configs/eslint.ts'],
	rules: { 'import-x/no-default-export': 'off' },
});

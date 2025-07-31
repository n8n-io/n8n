import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig, {
	files: ['./src/commands/*.ts'],
	rules: { 'import-x/no-default-export': 'off' },
});

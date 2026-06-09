import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(
	{ ignores: ['compiled/**', 'vitest.integration.config.ts'] },
	nodeConfig,
);

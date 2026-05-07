import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig({ ignores: ['compiled/**', 'vitest.e2e.config.ts'] }, nodeConfig);

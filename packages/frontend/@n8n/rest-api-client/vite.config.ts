import { defineConfig, mergeConfig } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/frontend';

export default mergeConfig(defineConfig({}), createVitestConfig({ setupFiles: [] }));

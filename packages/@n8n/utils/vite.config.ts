import { defineConfig, mergeConfig } from 'vite';
import { vitestConfig } from '@n8n/vitest-config/frontend';

export default mergeConfig(defineConfig({}), vitestConfig);

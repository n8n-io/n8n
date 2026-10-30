import { vitestConfig } from '@n8n/vitest-config/node';
import { defineConfig, mergeConfig } from 'vite';

export default mergeConfig(defineConfig({}), vitestConfig);

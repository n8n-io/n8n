import { defineConfig, mergeConfig } from 'vite';
import { vitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(defineConfig({}), vitestConfig);

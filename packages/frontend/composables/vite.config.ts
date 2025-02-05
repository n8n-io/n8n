import { defineConfig, mergeConfig } from 'vite';
import { vitestConfig } from '@n8n/frontend-vitest-config';

export default mergeConfig(defineConfig({}), vitestConfig);

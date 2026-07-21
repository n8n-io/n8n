import { defineConfig, mergeConfig } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/frontend';

// Pure constants: no DOM setup file and no jsdom environment needed.
const vitestConfig = createVitestConfig({ environment: 'node', setupFiles: [] });

export default mergeConfig(defineConfig({}), vitestConfig);

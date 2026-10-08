import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig } from 'vitest/config';
import { createVitestConfig } from '@n8n/vitest-config/frontend';

// The UI is Vue SFCs, so the plugin has to be present for `.vue` imports to parse.
export default mergeConfig(
	defineConfig({ plugins: [vue()] }),
	createVitestConfig({ setupFiles: [] }),
);

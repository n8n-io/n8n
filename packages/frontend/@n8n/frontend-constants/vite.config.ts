import { defineConfig, mergeConfig } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/frontend';

// Pure constants: no DOM setup file and no jsdom environment needed.
const vitestConfig = createVitestConfig({
	environment: 'node',
	setupFiles: [],
	// This package has very few test files. CI passes --shard=1/2 and --shard=2/2
	// to all frontend packages via turbo. Without this flag, vitest errors when
	// the shard count exceeds the number of test files.
	passWithNoTests: true,
});

export default mergeConfig(defineConfig({}), vitestConfig);

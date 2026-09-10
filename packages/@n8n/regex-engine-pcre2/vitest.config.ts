import { defineConfig, mergeConfig } from 'vitest/config';
import { vitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(
	defineConfig({
		test: {
			testTimeout: 30_000,
		},
	}),
	vitestConfig,
);

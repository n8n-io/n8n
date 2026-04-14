import { defineConfig, mergeConfig } from 'vitest/config';
import { vitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(
	vitestConfig,
	defineConfig({
		test: {
			setupFiles: ['./test/setup.ts'],
		},
	}),
);

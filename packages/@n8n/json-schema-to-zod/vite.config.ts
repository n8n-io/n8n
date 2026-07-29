import { defineConfig, mergeConfig } from 'vitest/config';
import { vitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(
	defineConfig({
		test: {
			setupFiles: ['./test/extend-expect.ts'],
		},
	}),
	vitestConfig,
);

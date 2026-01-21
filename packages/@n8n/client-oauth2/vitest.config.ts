import path from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import { createVitestConfig } from '@n8n/vitest-config/node';

export default mergeConfig(
	createVitestConfig(),
	defineConfig({
		resolve: {
			alias: { '@': path.resolve(__dirname, 'src') },
		},
	}),
);

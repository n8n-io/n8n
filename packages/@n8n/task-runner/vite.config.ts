import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import path from 'node:path';
import { mergeConfig } from 'vite';

export default mergeConfig(
	createVitestConfigWithDecorators({
		restoreMocks: true,
		testTimeout: 10_000,
	}),
	{
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
	},
);

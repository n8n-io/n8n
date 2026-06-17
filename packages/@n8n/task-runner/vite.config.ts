import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import path from 'node:path';
import { mergeConfig } from 'vite';

export default mergeConfig(
	createVitestConfigWithDecorators({
		// The n8n root jest.config sets `restoreMocks: true`, and test files silently rely on
		// it — omit this and mocks bleed between tests.
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

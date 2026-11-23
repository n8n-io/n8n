import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { mergeConfig } from 'vite';

export default mergeConfig(
	createVitestConfigWithDecorators({}, { pinCjs: ['@n8n/backend-common', '@n8n/decorators'] }),
	{
		test: {
			exclude: ['**/node_modules/**', '**/dist/**'],
		},
	},
);

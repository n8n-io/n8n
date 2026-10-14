import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@n8n/vitest-config/tsc-decorator-transform';
import { mergeConfig } from 'vite';

export default mergeConfig(
	createVitestConfigWithDecorators({}, { pinCjs: ['@n8n/backend-common', '@n8n/decorators'] }),
	{
		plugins: [
			tscDecoratorTransform({ filePredicate: (fileName) => /\.entity\.ts$/.test(fileName) }),
		],
		test: {
			exclude: ['**/node_modules/**', '**/dist/**'],
		},
	},
);

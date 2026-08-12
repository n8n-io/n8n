import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { resolve } from 'node:path';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(
	createVitestConfigWithDecorators({
		include: ['demo/**/*.test.ts'],
		setupFiles: ['./demo/setup.ts'],
	}),
	{
		resolve: {
			alias: {
				// The reusable engine harness lives in core but is consumed as source, like nodes-base does.
				'@nodes-testing': resolve(__dirname, '../core/nodes-testing'),
				// Let the demo import the package by its public name.
				'n8n-test': resolve(__dirname, 'src/index.ts'),
			},
		},
		oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
	},
);

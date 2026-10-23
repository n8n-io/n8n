import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@n8n/vitest-config/tsc-decorator-transform';
import path from 'node:path';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

const entitiesDirectory = path.join('database', 'entities') + path.sep;

export default mergeConfig(
	createVitestConfigWithDecorators({}, { pinCjs: ['@n8n/backend-common', '@n8n/decorators'] }),
	{
		plugins: [
			tscDecoratorTransform({
				filePredicate: (fileName) =>
					fileName.includes(entitiesDirectory) || /\.config\.ts$/.test(fileName),
			}),
		],
		test: {
			pool: 'forks',
			setupFiles: ['./test/setup-test-folder.ts'],
			exclude: [...configDefaults.exclude, '**/dist/**'],
		},
	},
);

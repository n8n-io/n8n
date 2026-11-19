import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { tscDecoratorTransform } from '@n8n/vitest-config/tsc-decorator-transform';
import { mergeConfig } from 'vite';

export default mergeConfig(createVitestConfigWithDecorators({}, { pinCjs: ['@n8n/decorators'] }), {
	plugins: [tscDecoratorTransform({ filePredicate: (fileName) => /\.entity\.ts$/.test(fileName) })],
	test: {
		pool: 'forks',
		setupFiles: ['./test/setup-test-folder.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
});

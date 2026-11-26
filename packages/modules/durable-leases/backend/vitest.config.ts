import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default mergeConfig(createVitestConfigWithDecorators({}, { pinCjs: ['@n8n/decorators'] }), {
	test: {
		pool: 'forks',
		exclude: [...configDefaults.exclude, '**/dist/**'],
	},
});

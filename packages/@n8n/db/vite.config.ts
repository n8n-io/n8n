import { defineConfig, mergeConfig } from 'vite';
import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';

export default mergeConfig(
	defineConfig({}),
	createVitestConfigWithDecorators({ exclude: ['dist/**'] }),
);

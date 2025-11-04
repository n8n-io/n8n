import swc from 'unplugin-swc';
import { mergeConfig } from 'vitest/config';
import {
	createVitestConfigNodeWithDecorators,
	swcOptions,
} from '@n8n/vitest-config/node-decorators';

export default mergeConfig(
	createVitestConfigNodeWithDecorators({ include: ['src/**/*.test.ts'] }),
	{
		plugins: [swc.vite(swcOptions)],
	},
);

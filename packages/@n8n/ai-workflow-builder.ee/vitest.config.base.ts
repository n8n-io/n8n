import path from 'node:path';
import { mergeConfig } from 'vite';
import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';

// Shared base config for both the unit (vite.config.ts) and integration
// (vitest.config.integration.ts) runs. Test include/exclude is intentionally
// left to the extending configs so they don't merge-concatenate each other's globs.
export const baseConfig = mergeConfig(
	// Pin `zod` to its CJS build so `instanceof z.ZodError` holds against the externalized
	// CJS dist. See `cjsPinAliases` in @n8n/vitest-config/node for the rationale.
	createVitestConfigWithDecorators({}, { pinCjs: ['zod'] }),
	{
		resolve: {
			alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
		},
	},
);

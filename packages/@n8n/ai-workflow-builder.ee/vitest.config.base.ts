import path from 'node:path';
import { mergeConfig } from 'vite';
import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';

// Shared base config for both the unit (vite.config.ts) and integration
// (vitest.config.integration.ts) runs. Test include/exclude is intentionally
// left to the extending configs so they don't merge-concatenate each other's globs.
export const baseConfig = mergeConfig(
	createVitestConfigWithDecorators({
		// The n8n root jest.config sets `restoreMocks: true`, and most test files silently
		// rely on it — omit this and mocks bleed between tests.
		restoreMocks: true,
	}),
	{
		resolve: {
			alias: [
				{ find: '@', replacement: path.resolve(__dirname, './src') },
				// zod has dual ESM/CJS exports (`./dist/esm/index.js` for `import`,
				// `./dist/cjs/index.js` for `require`) — two separate files with two separate
				// `ZodType` classes. Workspace deps CJS-require zod, test files ESM-import it, and
				// `instanceof z.ZodX` checks in source fail between them. Pin the top-level `zod`
				// import to the CJS file so both code paths share a single module instance.
				{
					find: /^zod$/,
					replacement: path.resolve(
						__dirname,
						'../../../node_modules/.pnpm/zod@3.25.67/node_modules/zod/dist/cjs/index.js',
					),
				},
			],
		},
	},
);

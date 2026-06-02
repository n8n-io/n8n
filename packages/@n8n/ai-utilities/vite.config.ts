import { createVitestConfig } from '@n8n/vitest-config/node';
import path from 'node:path';
import { mergeConfig } from 'vite';

export default mergeConfig(
	createVitestConfig({
		// The n8n root jest.config sets `restoreMocks: true`, and most test files silently
		// rely on it — omit this and mocks bleed between tests.
		restoreMocks: true,
	}),
	{
		resolve: {
			alias: [
				{ find: 'src', replacement: path.resolve(__dirname, './src') },
				// zod has dual ESM/CJS exports (two separate `ZodType` class identities).
				// Workspace deps CJS-require zod while tests ESM-import it, so
				// `schema instanceof ZodSchema` in src/converters/tool.ts fails across the
				// two. Pin the top-level `zod` import to the CJS file so both share one
				// module instance. Subpaths like `zod/v4` keep their normal resolution.
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

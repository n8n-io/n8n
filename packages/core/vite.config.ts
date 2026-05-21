import { mergeConfig } from 'vite';
import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import path from 'node:path';

export default mergeConfig(
	createVitestConfigWithDecorators({
		globalSetup: ['./test/setup.ts'],
		setupFiles: ['./test/setup-mocks.ts'],
	}),
	{
		resolve: {
			alias: [
				{ find: '@', replacement: path.resolve(__dirname, './src') },
				{ find: '@test', replacement: path.resolve(__dirname, './test') },
				// zod has dual ESM/CJS exports (`./dist/esm/index.js` for `import`,
				// `./dist/cjs/index.js` for `require`) — two separate files with two separate
				// `ZodType` classes. @n8n/config dist CJS-requires zod, test files ESM-import
				// it, and `instanceof` fails between them. Pin the top-level `zod` import to the
				// CJS file so both code paths share a single module instance. Subpaths like
				// `zod/v4` keep their normal resolution.
				{
					find: /^zod$/,
					replacement: path.resolve(
						__dirname,
						'../../node_modules/.pnpm/zod@3.25.67/node_modules/zod/dist/cjs/index.js',
					),
				},
			],
		},
		oxc: {
			// OXC's TS transform ignores tsconfig's `emitDecoratorMetadata` — must be enabled
			// explicitly here so `@n8n/config`'s `@Env(name, zodSchema) field: z.infer<...>`
			// pattern works (the decorator reads `design:type` via `Reflect.getMetadata`).
			decorator: {
				legacy: true,
				emitDecoratorMetadata: true,
			},
		},
	},
);

import { mergeConfig } from 'vite';
import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import path from 'node:path';

export default mergeConfig(
	createVitestConfigWithDecorators(
		{
			globalSetup: ['./test/setup.ts'],
			setupFiles: ['./test/setup-mocks.ts'],
		},
		// Pin `zod` and `n8n-workflow` to their CJS build so cross-boundary `instanceof`
		// (`ZodType`, `UserError`) holds against the externalized CJS dist. See
		// `cjsPinAliases` in @n8n/vitest-config/node for the rationale.
		{ pinCjs: ['zod', 'n8n-workflow'] },
	),
	{
		resolve: {
			alias: [
				{ find: '@', replacement: path.resolve(__dirname, './src') },
				{ find: '@test', replacement: path.resolve(__dirname, './test') },
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

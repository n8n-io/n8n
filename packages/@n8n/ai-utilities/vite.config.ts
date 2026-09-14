import { createVitestConfig } from '@n8n/vitest-config/node';
import path from 'node:path';
import { mergeConfig } from 'vite';

// `zod` is pinned to its CJS build (via `pinCjs`) so `schema instanceof ZodSchema` in
// src/converters/tool.ts holds against zod objects created in externalized CJS workspace
// deps. See `cjsPinAliases` in @n8n/vitest-config/node for the rationale.
export default mergeConfig(createVitestConfig({}, { pinCjs: ['zod'] }), {
	resolve: {
		alias: [{ find: 'src', replacement: path.resolve(__dirname, './src') }],
	},
});

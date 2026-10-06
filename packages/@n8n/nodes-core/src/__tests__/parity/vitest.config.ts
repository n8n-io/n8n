import { cjsPinAliases, createBaseInlineConfig } from '@n8n/vitest-config/node';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const packageRoot = path.resolve(__dirname, '../../..');

// Parity tests end in `.parity.ts`, so the package's own `vitest run` skips them.
// They load the core, nodes-base and nodes-langchain builds.
export default defineConfig({
	// Keep the Vite cache in the package, not next to the tests.
	cacheDir: path.resolve(packageRoot, 'node_modules/.vite'),
	test: createBaseInlineConfig({
		root: __dirname,
		include: ['**/*.parity.ts'],
		testTimeout: 60_000,
		hookTimeout: 60_000,
	}),
	resolve: {
		alias: [
			// Run the node-sdk source, so the gate checks the runtime the actions use without a build.
			{
				find: /^@n8n\/node-sdk$/,
				replacement: path.resolve(packageRoot, '../node-sdk/src/index.ts'),
			},
			{
				find: /^@n8n\/node-sdk\/(credentials|host|registry|codegen)$/,
				replacement: path.resolve(packageRoot, '../node-sdk/src/entry/$1.ts'),
			},
			// The engine and the nodes require the CommonJS n8n-workflow; the source must share it.
			...cjsPinAliases(['n8n-workflow'], packageRoot),
		],
	},
});

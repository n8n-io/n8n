import { resolve } from 'path';
import type { Alias } from 'vite';

// `@n8n/frontend-vite-config` holds the part that modules also use. Each module needs the same
// map for its own vitest run. A module must not import from the shell.
import { shellAliases } from '@n8n/frontend-vite-config';

export const appAliases = (editorUiDir: string): Alias[] => [
	{ find: '@', replacement: resolve(editorUiDir, 'src') },
	// Stub out @n8n/expression-runtime for browser build (it pulls in isolated-vm, a Node.js-only native module)
	{
		find: '@n8n/expression-runtime',
		replacement: resolve(editorUiDir, 'vite/expression-runtime-stub.ts'),
	},
	{
		// For sanitize-html
		find: 'source-map-js',
		replacement: resolve(editorUiDir, 'vite/source-map-js-shim'),
	},
];

export const editorUiAliases = (editorUiDir: string, packagesDir: string): Alias[] => [
	...appAliases(editorUiDir),
	...shellAliases(packagesDir),
];

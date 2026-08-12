import { resolve } from 'path';
import type { Alias } from 'vite';

// Everything reusable — the source-package table, the transitive workspace exceptions, the vendor
// rewrites — lives in `@n8n/frontend-vite-config`, because editor-ui is not its only consumer:
// every module needs the same mapping for its own vitest run, and a module cannot import from the
// shell it plugs into. What stays here is only what points at a file inside editor-ui.
import { shellAliases } from '@n8n/frontend-vite-config';

/** Aliases that resolve to editor-ui's own files, so they cannot live anywhere else. */
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

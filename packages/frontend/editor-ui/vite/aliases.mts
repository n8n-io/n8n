import { frontendSourceAliases } from '@n8n/vitest-config/frontend-aliases';
import { resolve } from 'path';
import type { Alias } from 'vite';

/**
 * Aliases that belong to editor-ui itself: its own `@/` root, the browser stubs, and the lodash
 * deep-import rewrites. Nothing here is shared with other frontend packages.
 */
export const appAliases = (editorUiDir: string): Alias[] => [
	{ find: '@', replacement: resolve(editorUiDir, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
	// Stub out @n8n/expression-runtime for browser build (it pulls in isolated-vm, a Node.js-only native module)
	{
		find: '@n8n/expression-runtime',
		replacement: resolve(editorUiDir, 'vite/expression-runtime-stub.ts'),
	},
];

/** Rewrites for third-party specifiers, unrelated to how workspace packages resolve. */
export const vendorAliases = (editorUiDir: string): Alias[] => [
	...['orderBy', 'camelCase', 'cloneDeep', 'startCase'].map((name) => ({
		find: new RegExp(`^lodash.${name}$`, 'i'),
		replacement: `lodash/${name}`,
	})),
	{
		find: /^lodash\.(.+)$/,
		replacement: 'lodash/$1',
	},
	{
		// For sanitize-html
		find: 'source-map-js',
		replacement: resolve(editorUiDir, 'vite/source-map-js-shim'),
	},
];

export const editorUiAliases = (editorUiDir: string, packagesDir: string): Alias[] => [
	...appAliases(editorUiDir),
	// Workspace packages resolve to source, not dist, so a dev-server edit in one of them
	// hot-reloads the editor. Derived from the filesystem by `@n8n/vitest-config` so this list and
	// the tsconfig `paths` block cannot drift apart again — `pnpm check:frontend-aliases` gates it.
	...frontendSourceAliases({ repoRoot: resolve(packagesDir, '..'), consumerDir: editorUiDir }),
	...vendorAliases(editorUiDir),
];

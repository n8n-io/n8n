import { resolve } from 'path';
import type { Alias } from 'vite';

// The source-package table and its regex expansion live in `@n8n/vitest-config` because editor-ui
// stopped being their only consumer: every `packages/modules/<name>/frontend` needs the same
// mapping for its own vitest run, and a module cannot import from the shell it plugs into. Still
// hand-maintained, still guarded by `aliases.test.ts` — only the file it sits in changed.
import {
	frontendModuleAliases,
	frontendSourceAliases,
} from '@n8n/vitest-config/frontend-source-packages';

/**
 * Aliases that belong to editor-ui itself: its own `@/` root and the fixes for transitive
 * dependencies that misbehave in a browser graph. These packages are reached through
 * `n8n-workflow`, not imported by editor-ui directly.
 */
export const appAliases = (editorUiDir: string, packagesDir: string): Alias[] => [
	{ find: '@', replacement: resolve(editorUiDir, 'src') },
	{ find: 'stream', replacement: 'stream-browserify' },
	// Stub out @n8n/expression-runtime for browser build (it pulls in isolated-vm, a Node.js-only native module)
	{
		find: '@n8n/expression-runtime',
		replacement: resolve(editorUiDir, 'vite/expression-runtime-stub.ts'),
	},
	// `n8n-workflow`'s expression-sandboxing imports `astVisit` from @n8n/tournament, whose dist is
	// CJS. Linked workspace packages skip optimizeDeps, so the dev server serves that file verbatim
	// and the browser fails to parse a named export out of it; the build survives because rolldown
	// interops CJS, but pays ~397 kB in defeated tree-shaking. Resolving to src avoids both.
	{ find: '@n8n/tournament', replacement: resolve(packagesDir, '@n8n', 'tournament', 'src') },
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
	...appAliases(editorUiDir, packagesDir),
	...frontendSourceAliases(packagesDir),
	...frontendModuleAliases(packagesDir),
	...vendorAliases(editorUiDir),
];

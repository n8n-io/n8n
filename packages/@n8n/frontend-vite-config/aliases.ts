import { resolve } from 'node:path';
import type { Alias } from 'vite';

import { frontendModuleAliases, frontendSourceAliases } from './source-packages.js';

/**
 * Packages reached *transitively*: they are not a declared dependency of anyone, so they cannot sit
 * in the source-packages table.
 *
 * `n8n-workflow`'s expression-sandboxing imports `astVisit` from `@n8n/tournament`, whose dist is
 * CJS. Linked workspace packages skip optimizeDeps, so the dev server serves that file verbatim and
 * the browser fails to parse a named export out of it; the build survives because rolldown interops
 * CJS, but pays ~397 kB in defeated tree-shaking. Resolving to src avoids both.
 */
export const transitiveWorkspaceAliases = (packagesDir: string): Alias[] => [
	{ find: '@n8n/tournament', replacement: resolve(packagesDir, '@n8n', 'tournament', 'src') },
];

/**
 * Shell-only, deliberately out of `frontendAliases`: these replacements are bare specifiers
 * resolved from the consumer's own `node_modules`, and only editor-ui declares `lodash` and
 * `stream-browserify`. Shared with a module's vitest, a value import of `stream` anywhere in its
 * graph would fail to resolve — latent today only because `n8n-workflow` imports `stream` as a
 * type.
 */
export const vendorAliases = (): Alias[] => [
	...['orderBy', 'camelCase', 'cloneDeep', 'startCase'].map((name) => ({
		find: new RegExp(`^lodash.${name}$`, 'i'),
		replacement: `lodash/${name}`,
	})),
	{ find: /^lodash\.(.+)$/, replacement: 'lodash/$1' },
	// `n8n-workflow` reaches Node's `stream` in a browser graph.
	{ find: 'stream', replacement: 'stream-browserify' },
];

/**
 * Every entry rewrites to an absolute path under `packages/`, which is what makes the set safe to
 * share from any directory — `aliases.test.ts` holds that line.
 */
export const frontendAliases = (packagesDir: string): Alias[] => [
	...frontendSourceAliases(packagesDir),
	...transitiveWorkspaceAliases(packagesDir),
];

/**
 * Order is resolution order: vendor rewrites stay last, where they sat before this package existed.
 */
export const shellAliases = (packagesDir: string): Alias[] => [
	...frontendAliases(packagesDir),
	...frontendModuleAliases(packagesDir),
	...vendorAliases(),
];

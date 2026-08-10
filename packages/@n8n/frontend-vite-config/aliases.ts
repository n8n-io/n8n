import { resolve } from 'node:path';
import type { Alias } from 'vite';

import { frontendModuleAliases, frontendSourceAliases } from './source-packages.js';

/**
 * Workspace-resolution exceptions: packages reached *transitively*, so they are not declared
 * dependencies of anyone and cannot sit in the source-packages table.
 *
 * `n8n-workflow`'s expression-sandboxing imports `astVisit` from `@n8n/tournament`, whose dist is
 * CJS. Linked workspace packages skip optimizeDeps, so the dev server serves that file verbatim and
 * the browser fails to parse a named export out of it; the build survives because rolldown interops
 * CJS, but pays ~397 kB in defeated tree-shaking. Resolving to src avoids both.
 */
export const transitiveWorkspaceAliases = (packagesDir: string): Alias[] => [
	{ find: '@n8n/tournament', replacement: resolve(packagesDir, '@n8n', 'tournament', 'src') },
];

/** Rewrites for third-party specifiers, unrelated to how workspace packages resolve. */
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
 * Everything a frontend Vite or vitest config needs that is *not* specific to one package:
 * the platform source mapping, the transitive workspace exceptions and the vendor rewrites.
 *
 * Sibling modules are deliberately absent — `frontendModuleAliases` is exported separately because
 * only the shell may resolve them. A module aliasing its siblings would let an accidental
 * cross-module import resolve at test time, which is the boundary the module tsconfig base holds.
 */
export const frontendAliases = (packagesDir: string): Alias[] => [
	...frontendSourceAliases(packagesDir),
	...transitiveWorkspaceAliases(packagesDir),
	...vendorAliases(),
];

/** The shell's full set: the shared aliases plus the module mapping only it may resolve. */
export const shellAliases = (packagesDir: string): Alias[] => [
	...frontendAliases(packagesDir),
	...frontendModuleAliases(packagesDir),
];

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

/**
 * Rewrites for third-party specifiers, unrelated to how workspace packages resolve.
 *
 * **Shell-only, deliberately out of `frontendAliases`:** these replacements are bare specifiers
 * resolved from the consumer's own `node_modules`, and only editor-ui declares `lodash` and
 * `stream-browserify`. Shared with a module's vitest, a value import of `stream` anywhere in its
 * graph fails to resolve — latent today only because `n8n-workflow` imports `stream` as a type.
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
 * Everything a frontend Vite or vitest config needs that is *not* specific to one package: the
 * platform source mapping plus the transitive workspace exceptions. Every entry here rewrites to an
 * absolute path under `packages/`, which is what makes the set safe to share from any directory —
 * `aliases.test.ts` holds that line.
 *
 * Sibling modules are deliberately absent — `frontendModuleAliases` is exported separately because
 * only the shell may resolve them. A module aliasing its siblings would let an accidental
 * cross-module import resolve at test time, which is the boundary the module tsconfig base holds.
 */
export const frontendAliases = (packagesDir: string): Alias[] => [
	...frontendSourceAliases(packagesDir),
	...transitiveWorkspaceAliases(packagesDir),
];

/**
 * The shell's full set: the shared aliases, the module mapping only it may resolve, and the vendor
 * rewrites only it can resolve. Vendor rewrites stay last, where they sat before this package
 * existed, so the shell's resolution order is unchanged by the move.
 */
export const shellAliases = (packagesDir: string): Alias[] => [
	...frontendAliases(packagesDir),
	...frontendModuleAliases(packagesDir),
	...vendorAliases(),
];

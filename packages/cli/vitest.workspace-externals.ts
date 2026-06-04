import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Forces n8n workspace packages to load from their built `dist/` and marks them
 * external (loaded via Node's require, so a single instance is shared).
 *
 * Why this is needed: pnpm symlinks workspace packages into `node_modules`, but
 * they resolve to their real path under `packages/`, which does NOT match
 * Vitest's default `/node_modules/` external rule — so Vitest *inlines* them and
 * Vite transforms their `src` (picked via the `module` field). That source tree
 * includes TypeORM entities whose `emitDecoratorMetadata`/type-only imports oxc
 * mishandles, and loading each workspace package as both Vite-transformed source
 * and Node-required dist produces two `@n8n/di` Containers. Resolving them to
 * `dist` via Node (`require.resolve`, which ignores the `module` field) and
 * externalizing fixes both.
 *
 * `@n8n/backend-test-utils` is intentionally excluded: it is loaded from source
 * so it picks up `vitest-mock-extended`/`vi` (its `dist/` is the stale jest
 * build). `@n8n/mcp-apps/server` is excluded because a dedicated alias maps it to
 * source for mocking.
 */
export function workspaceDistExternals(): Plugin {
	const projectDir = process.cwd();
	const req = createRequire(path.join(projectDir, 'index.js'));

	const EXCLUDE = new Set(['@n8n/backend-test-utils', '@n8n/mcp-apps/server']);
	const N8N_PREFIXES = ['n8n-workflow', 'n8n-core', 'n8n-nodes-base', 'n8n-editor-ui'];

	const isWorkspacePkg = (source: string) => {
		if (EXCLUDE.has(source)) return false;
		if (source.startsWith('@n8n/')) return true;
		return N8N_PREFIXES.some((name) => source === name || source.startsWith(`${name}/`));
	};

	return {
		name: 'workspace-dist-externals',
		enforce: 'pre',
		resolveId(source) {
			if (!isWorkspacePkg(source)) return null;
			try {
				return { id: req.resolve(source), external: true };
			} catch {
				// Not resolvable to a built entry (e.g. a types-only subpath) — let the
				// default resolver handle it.
				return null;
			}
		},
	};
}

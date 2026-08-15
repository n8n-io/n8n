import { resolve } from 'node:path';
import type { Alias } from 'vite';

/**
 * Workspace packages the frontend consumes from source rather than from `dist`, so that an edit in
 * one of them hot-reloads the editor without a rebuild. `dir` is relative to `packages/`.
 *
 * Must stay in step with editor-ui's tsconfig `paths` and with `tsconfig.frontend-module.json`:
 * when those disagreed, vue-tsc typechecked a package from `src` while the bundle was built from
 * its `dist`. `editor-ui/vite/aliases.test.ts` fails when they diverge and names what to update.
 *
 * It lives here rather than in editor-ui because every `packages/modules/<name>/frontend` needs the
 * same mapping for its own vitest run, and a module cannot import from the shell it plugs into.
 *
 * `entry: false` marks packages with no `src/index.ts`. Their `exports` map has no `.`, so a bare
 * import of them does not resolve at all and must not be aliased.
 */
export const sourcePackages = [
	{ name: '@n8n/api-types', dir: '@n8n/api-types' },
	{ name: '@n8n/chat', dir: 'frontend/@n8n/chat' },
	{ name: '@n8n/chat-hub', dir: '@n8n/chat-hub' },
	{ name: '@n8n/composables', dir: 'frontend/@n8n/composables', entry: false },
	{ name: '@n8n/constants', dir: '@n8n/constants' },
	{ name: '@n8n/design-system', dir: 'frontend/@n8n/design-system' },
	{ name: '@n8n/frontend-constants', dir: 'frontend/@n8n/frontend-constants', entry: false },
	{ name: '@n8n/frontend-module-sdk', dir: 'frontend/@n8n/frontend-module-sdk' },
	{ name: '@n8n/frontend-utils', dir: 'frontend/@n8n/frontend-utils', entry: false },
	{ name: '@n8n/i18n', dir: 'frontend/@n8n/i18n' },
	{ name: '@n8n/rest-api-client', dir: 'frontend/@n8n/rest-api-client' },
	{ name: '@n8n/stores', dir: 'frontend/@n8n/stores' },
	{ name: '@n8n/telemetry', dir: '@n8n/telemetry' },
	{ name: '@n8n/utils', dir: '@n8n/utils', entry: false },
];

/**
 * Feature module packages, appended by `n8n-module-sdk create`. Kept separate from the table above
 * because only the shell may resolve them: a module aliasing its siblings would let an accidental
 * cross-module import resolve at test time, which is the boundary the module tsconfig base holds.
 */
export const modulePackages: Array<{ name: string; dir: string; entry?: boolean }> = [];

const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Each package gets a slash-delimited, anchored pair — `^@n8n/chat$` and `^@n8n/chat/(.+)$`. One
 * open-ended `^@n8n/chat(.+)$` would match `@n8n/chat-hub/…` as well, and would leave the bare
 * `@n8n/chat` unmatched — `(.+)` needs a character after the package name — falling through to
 * `dist`.
 */
const expand = (packagesDir: string, packages: typeof modulePackages): Alias[] =>
	packages.flatMap(({ name, dir, entry = true }) => {
		const src = resolve(packagesDir, dir, 'src');
		const pattern = escapeForRegExp(name);

		return [
			...(entry
				? [{ find: new RegExp(`^${pattern}$`), replacement: resolve(src, 'index.ts') }]
				: []),
			{ find: new RegExp(`^${pattern}/(.+)$`), replacement: `${src}/$1` },
		];
	});

export const frontendSourceAliases = (packagesDir: string): Alias[] =>
	expand(packagesDir, sourcePackages);

/** Shell-only — see `modulePackages`. */
export const frontendModuleAliases = (packagesDir: string): Alias[] =>
	expand(packagesDir, modulePackages);

import { resolve } from 'path';
import type { Alias } from 'vite';

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

/**
 * Workspace packages the frontend consumes from source rather than from `dist`, so that an edit in
 * one of them hot-reloads the editor without a rebuild.
 *
 * Hand-maintained, and it has to stay in step with editor-ui's tsconfig `paths` — when the two
 * disagreed, vue-tsc typechecked a package from `src` while the bundle was built from its `dist`.
 * `aliases.test.ts` fails when they diverge; add a package here and it will tell you what else to
 * update. `dir` is relative to `packages/`.
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

const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Each package gets a slash-delimited, anchored pair — `^@n8n/chat$` and `^@n8n/chat/(.+)$`. One
 * open-ended `^@n8n/chat(.+)$` would match `@n8n/chat-hub/…` as well, and would leave the bare
 * `@n8n/chat` unmatched: `(.+)` needs a character after the package name, which is how 115 bare
 * `@n8n/stores` imports used to fall through to `dist`.
 */
export const frontendSourceAliases = (packagesDir: string): Alias[] =>
	sourcePackages.flatMap(({ name, dir, entry = true }) => {
		const src = resolve(packagesDir, dir, 'src');
		const pattern = escapeForRegExp(name);

		return [
			...(entry
				? [{ find: new RegExp(`^${pattern}$`), replacement: resolve(src, 'index.ts') }]
				: []),
			{ find: new RegExp(`^${pattern}/(.+)$`), replacement: `${src}/$1` },
		];
	});

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
	...vendorAliases(editorUiDir),
];

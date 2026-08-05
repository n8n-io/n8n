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

/**
 * Ensure bare imports resolve to sources (not dist).
 *
 * TRANSITIONAL — this is the hand-maintained list as it stood before `@n8n/vitest-config`'s
 * `frontendSourceAliases()` existed, kept here only so `aliases.test.ts` can prove the generated
 * mapping against it. The follow-up commit replaces the body with the generator call and deletes
 * this comment; see `aliases.test.ts` for the resolution deltas that switch involves.
 */
export const frontendSourceAliases = (packagesDir: string): Alias[] => [
	{ find: '@n8n/i18n', replacement: resolve(packagesDir, 'frontend', '@n8n', 'i18n', 'src') },
	{ find: '@n8n/chat-hub', replacement: resolve(packagesDir, '@n8n', 'chat-hub', 'src') },
	{ find: '@n8n/tournament', replacement: resolve(packagesDir, '@n8n', 'tournament', 'src') },
	{
		find: /^@n8n\/chat(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'chat', 'src$1'),
	},
	{
		find: /^@n8n\/chat-hub(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'chat-hub', 'src$1'),
	},
	{
		find: /^@n8n\/api-requests(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'api-requests', 'src$1'),
	},
	{
		find: /^@n8n\/composables(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'composables', 'src$1'),
	},
	{
		find: /^@n8n\/frontend-module-sdk$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'frontend-module-sdk', 'src/index.ts'),
	},
	{
		find: /^@n8n\/constants(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'constants', 'src$1'),
	},
	{
		find: /^@n8n\/design-system$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src/index.ts'),
	},
	{
		find: /^@n8n\/design-system(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'design-system', 'src$1'),
	},
	{
		find: /^@n8n\/i18n(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'i18n', 'src$1'),
	},
	{
		find: /^@n8n\/stores(.+)$/,
		replacement: resolve(packagesDir, 'frontend', '@n8n', 'stores', 'src$1'),
	},
	{
		find: /^@n8n\/telemetry$/,
		replacement: resolve(packagesDir, '@n8n', 'telemetry', 'src/index.ts'),
	},
	{
		find: /^@n8n\/telemetry(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'telemetry', 'src$1'),
	},
	{
		find: /^@n8n\/utils(.+)$/,
		replacement: resolve(packagesDir, '@n8n', 'utils', 'src$1'),
	},
];

export const editorUiAliases = (editorUiDir: string, packagesDir: string): Alias[] => [
	...appAliases(editorUiDir),
	...frontendSourceAliases(packagesDir),
	...vendorAliases(editorUiDir),
];

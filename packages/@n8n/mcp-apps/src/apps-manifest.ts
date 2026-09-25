/**
 * Canonical manifest of MCP apps shipped by this package. Adding a new app
 * is a single edit here: add one entry, and both the Vite build (entry
 * directory + output HTML filename) and the server-side resource loader
 * (compile-time union + runtime allow-list of loadable files) update
 * automatically. This keeps the build and runtime in lockstep, with no
 * separate registries to drift out of sync.
 */
// Keys are kebab-case to match the Vite `--mode` argument (which is also the
// app's URL slug). Disabling the naming-convention lint rule lets us keep
// that convention without leaking exceptions to other identifiers.
/* eslint-disable @typescript-eslint/naming-convention */
export const MCP_APPS = {
	'workflow-preview': {
		/** Directory under `src/apps/` containing the Vue source for the app. */
		entry: 'workflow-preview',
		/** Output filename under `dist/apps/` produced by the Vite build. */
		htmlFile: 'workflow-preview.html',
	},
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type McpAppId = keyof typeof MCP_APPS;
export type McpAppHtmlFileName = (typeof MCP_APPS)[McpAppId]['htmlFile'];

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { MCP_APPS, type McpAppHtmlFileName } from '../apps-manifest';

export type { McpAppHtmlFileName };

/**
 * Runtime allow-list of loadable HTML files, derived from the apps manifest.
 * Keeps the build (Vite output filenames) and runtime (server file loader)
 * in lockstep — there is no separate list to maintain.
 */
const APP_HTML_FILE_NAME_SET: ReadonlySet<string> = new Set(
	Object.values(MCP_APPS).map((app) => app.htmlFile),
);

const appHtmlCache = new Map<McpAppHtmlFileName, string>();

/**
 * Reads a prebuilt MCP app HTML file from the package's `dist/apps/`
 * directory. `fileName` is constrained to filenames declared in
 * `apps-manifest.ts` both at compile time (via the typed union) and at
 * runtime (via the set membership check), so that future callers that route
 * in user- or host-supplied strings cannot reach arbitrary files on disk.
 */
export async function loadAppHtml(fileName: McpAppHtmlFileName): Promise<string> {
	if (!APP_HTML_FILE_NAME_SET.has(fileName)) {
		throw new Error(`Unknown MCP app HTML file: ${fileName}`);
	}

	const cached = appHtmlCache.get(fileName);
	if (cached !== undefined) return cached;

	const html = await readFile(join(getPackageRoot(), 'dist', 'apps', fileName), 'utf8');
	appHtmlCache.set(fileName, html);
	return html;
}

function getPackageRoot(): string {
	const requireFromHere = createRequire(__filename);
	return dirname(requireFromHere.resolve('@n8n/mcp-apps/package.json'));
}

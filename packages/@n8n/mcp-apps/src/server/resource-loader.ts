import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const appHtmlCache = new Map<string, string>();

export async function loadAppHtml(fileName: string): Promise<string> {
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

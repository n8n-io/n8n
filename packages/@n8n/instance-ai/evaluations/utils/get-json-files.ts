import { readdirSync } from 'fs';
import { basename, join } from 'path';

/** Split a comma-separated CLI value into a normalized list of substring tokens. */
export function parseSubstringList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.length > 0);
}

export function getJsonFiles(dataDir: string, filter?: string, exclude?: string): string[] {
	const allFiles = readdirSync(dataDir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(dataDir, f));

	let files = allFiles;
	const includeTokens = parseSubstringList(filter);
	if (includeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = basename(f).toLowerCase();
			return includeTokens.some((t) => lower.includes(t));
		});
	}

	const excludeTokens = parseSubstringList(exclude);
	if (excludeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = basename(f).toLowerCase();
			return !excludeTokens.some((t) => lower.includes(t));
		});
	}

	return files;
}

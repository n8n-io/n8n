import { posix } from 'node:path';

/** Extensions of scripts and code. A skill that runs a left-out script can stop working. */
const SCRIPT_FILE =
	/\.(?:sh|bash|zsh|fish|ps1|bat|cmd|py|rb|pl|php|lua|r|js|mjs|cjs|ts|mts|cts|jsx|tsx|go|rs|java|kt|swift|c|cc|cpp|h|hpp|cs)$/i;

export function isScriptFile(path: string): boolean {
	return SCRIPT_FILE.test(path);
}

/** The bucket for a file with no extension, such as `LICENSE` or `.env`. */
export const NO_EXTENSION = 'none';

/** The bucket for an unusual extension, and for the extensions over the cap. */
export const OTHER_EXTENSION = 'other';

/** The most extensions that telemetry reports by name. The rest go to `other`. */
export const MAX_REPORTED_EXTENSIONS = 20;

/** A plain extension. Anything else can hold part of a file name, so it goes to `other`. */
const PLAIN_EXTENSION = /^\.[a-z0-9]{1,10}$/;

/**
 * Counts the skipped files by extension, for telemetry. Gives only extensions and counts,
 * never a name or a path. The extensions are lowercase, and the map stays bounded.
 */
export function countSkippedFiles(paths: string[]): {
	extensions: Record<string, number>;
	scripts: number;
} {
	const counts = new Map<string, number>();
	for (const path of paths) {
		const key = extensionKey(path);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	// The most common extensions keep their name. Ties sort by name, so the result is stable.
	const ranked = [...counts].sort(
		([leftKey, leftCount], [rightKey, rightCount]) =>
			rightCount - leftCount || leftKey.localeCompare(rightKey),
	);
	const extensions: Record<string, number> = {};
	let other = 0;
	for (const [key, count] of ranked) {
		const named =
			key !== OTHER_EXTENSION && Object.keys(extensions).length < MAX_REPORTED_EXTENSIONS;
		if (named) extensions[key] = count;
		else other += count;
	}
	if (other > 0) extensions[OTHER_EXTENSION] = other;
	return { extensions, scripts: paths.filter(isScriptFile).length };
}

function extensionKey(path: string): string {
	const extension = posix.extname(path).toLowerCase();
	// `extname` gives `.` for a name that ends in a dot.
	if (extension === '' || extension === '.') return NO_EXTENSION;
	return PLAIN_EXTENSION.test(extension) ? extension : OTHER_EXTENSION;
}

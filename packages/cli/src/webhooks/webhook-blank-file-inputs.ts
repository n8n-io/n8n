import type formidable from 'formidable';
import { rm } from 'node:fs/promises';

type ParsedFiles = Record<string, formidable.File[] | undefined>;

// A browser submits a file input the user left empty as a 0-byte part that
// declares `filename=""`. A part that omits the filename attribute altogether
// is a different case: formidable reports `null` rather than an empty string,
// and non-browser clients upload real content that way.
const isBlankFileInput = (file: formidable.File): boolean =>
	file.originalFilename === '' && file.size === 0;

/**
 * Returns the file inputs the user filled in, so a request produces no binary
 * for an input left empty. formidable applies its size limits while it writes
 * each part, so the caller parses every part and discards the blank ones here,
 * rather than skipping them with formidable's `filter` option, which would
 * exempt a part from those limits.
 *
 * Deletes the temp file of every discarded input. A node deletes the temp file
 * of each input it copies, and nothing else would delete these.
 */
export const discardBlankFileInputs = async (files: ParsedFiles): Promise<ParsedFiles> => {
	const filled: ParsedFiles = {};
	const discarded: formidable.File[] = [];

	// Own keys only. A part named `__proto__` reassigns this object's prototype
	// instead of adding a key, so `for...in` would walk the array it now inherits.
	for (const [key, entries] of Object.entries(files)) {
		if (!entries) continue;

		const keptEntries: formidable.File[] = [];

		for (const file of entries) {
			if (isBlankFileInput(file)) discarded.push(file);
			else keptEntries.push(file);
		}

		if (keptEntries.length > 0) filled[key] = keptEntries;
	}

	// Cleanup is best effort. A failed deletion must not turn a parsed request
	// into an error, so each failure is swallowed rather than propagated.
	await Promise.all(
		discarded.map(async (file) => {
			try {
				await rm(file.filepath, { force: true });
			} catch {
				// The temp file stays behind, which is preferable to failing the request.
			}
		}),
	);

	return filled;
};

import { ensureError, isSafeObjectProperty, setSafeObjectProperty, UserError } from 'n8n-workflow';
import path from 'node:path';
import type { ReadEntry } from 'tar';

import { DecompressedSizeExceededError } from './DecompressedSizeExceededError';

/**
 * Whether an entry path is absolute or escapes the archive root via `..`.
 * Such entries are skipped rather than surfaced.
 */
function escapesRoot(entryPath: string): boolean {
	const trimmed = entryPath.endsWith('/') ? entryPath.slice(0, -1) : entryPath;
	if (trimmed.startsWith('/')) return true;

	const normalized = path.posix.normalize(trimmed);
	return (
		normalized === '..' ||
		normalized.startsWith('../') ||
		normalized.includes('/../') ||
		normalized.endsWith('/..')
	);
}

/**
 * Decompress a tar archive (optionally gzip-compressed, e.g. .tar.gz/.tgz) with
 * upper bounds on total output size and number of entries.
 *
 * Only regular files are returned; directories, symbolic links and other special
 * entry types are skipped. The size limit is enforced from each entry's declared
 * header size, before its body is read, so an oversized archive is rejected
 * without buffering its contents. Gzip compression is detected automatically.
 */
export async function boundedUntar(
	data: Buffer,
	maxOutputSize: number,
	maxEntries: number,
): Promise<Record<string, Buffer>> {
	// Lazy-load tar since it is only needed on this decompress path.
	const { Parser } = await import('tar');

	return await new Promise<Record<string, Buffer>>((resolve, reject) => {
		const result: Record<string, Buffer> = {};
		let entryCount = 0;
		let totalSize = 0;
		let settled = false;

		const fail = (error: Error): void => {
			if (settled) return;
			settled = true;
			try {
				parser.abort(error);
			} catch {
				// abort can throw if the parser is already torn down; ignore and reject below
			}
			reject(error);
		};

		const parser = new Parser();

		parser.on('entry', (entry: ReadEntry) => {
			if (settled) {
				entry.resume();
				return;
			}

			// Only surface regular files, mirroring how the zip path skips directories.
			if (entry.type !== 'File' && entry.type !== 'OldFile' && entry.type !== 'ContiguousFile') {
				entry.resume();
				return;
			}

			// Skip entries that are absolute or reach outside the archive root.
			if (escapesRoot(entry.path)) {
				entry.resume();
				return;
			}

			// Skip entries whose path would write to an unsafe object key (e.g. __proto__).
			if (!isSafeObjectProperty(entry.path)) {
				entry.resume();
				return;
			}

			if (++entryCount > maxEntries) {
				fail(new UserError(`The archive contains more than ${maxEntries} entries`));
				entry.resume();
				return;
			}

			totalSize += entry.size;
			if (totalSize > maxOutputSize) {
				fail(new DecompressedSizeExceededError(maxOutputSize));
				entry.resume();
				return;
			}

			const chunks: Buffer[] = [];
			entry.on('data', (chunk: Buffer) => chunks.push(chunk));
			entry.on('end', () => {
				if (!settled) setSafeObjectProperty(result, entry.path, Buffer.concat(chunks));
			});
			entry.on('error', (error: unknown) => fail(ensureError(error)));
			entry.resume();
		});

		parser.on('error', (error: Error) => fail(ensureError(error)));
		parser.on('end', () => {
			if (!settled) {
				settled = true;
				resolve(result);
			}
		});

		parser.end(data);
	});
}

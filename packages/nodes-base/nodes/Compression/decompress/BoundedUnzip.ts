import { UserError } from 'n8n-workflow';
import { promisify } from 'node:util';
import { inflateRaw } from 'node:zlib';

import { DecompressedSizeExceededError } from './DecompressedSizeExceededError';
import { DEFLATED, readCentralDirectory, STORED, type ZipEntry } from './ZipCentralDirectory';

const inflateRawAsync = promisify(inflateRaw);

async function extractEntry(
	data: Buffer,
	entry: ZipEntry,
	budget: number,
	maxOutputSize: number,
): Promise<Buffer> {
	const compressed = data.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);

	if (entry.compression === STORED) {
		if (compressed.length > budget) throw new DecompressedSizeExceededError(maxOutputSize);
		return Buffer.from(compressed);
	}

	if (entry.compression !== DEFLATED) {
		throw new UserError(`unknown compression type ${entry.compression}`);
	}

	try {
		// zlib rejects maxOutputLength: 0, so a zero budget is raised to 1 and
		// enforced by the length check below instead
		const bytes = await inflateRawAsync(compressed, { maxOutputLength: Math.max(budget, 1) });
		if (bytes.length > budget) throw new DecompressedSizeExceededError(maxOutputSize);
		return bytes;
	} catch (error) {
		if (error instanceof RangeError && 'code' in error && error.code === 'ERR_BUFFER_TOO_LARGE') {
			throw new DecompressedSizeExceededError(maxOutputSize);
		}
		throw error;
	}
}

/**
 * Decompress a zip archive with upper bounds on total output size and number of
 * entries. Entries are inflated on the libuv thread pool via `zlib.inflateRaw`,
 * so the main thread is never blocked, whatever the compression ratio.
 *
 * The bound is enforced against the bytes actually produced (`maxOutputLength`),
 * not against the sizes the archive declares for itself. A declared size is
 * still consulted first, so an entry that admits to being oversized costs
 * nothing to reject, but it is never the last word: archives that overstate a
 * size (an unresolved ZIP64 sentinel, say) must not fail, and archives that
 * understate one must not yield a silently truncated member.
 */
export async function boundedUnzip(
	data: Buffer,
	maxOutputSize: number,
	maxEntries: number,
): Promise<Record<string, Buffer>> {
	const entries: ZipEntry[] = [];
	for (const entry of readCentralDirectory(data)) {
		// ZIP spec mandates '/' as path separator; a trailing slash marks a directory
		if (entry.name.endsWith('/')) continue;
		if (entries.length === maxEntries) {
			throw new UserError(`The archive contains more than ${maxEntries} entries`);
		}
		entries.push(entry);
	}

	// Entry names come from the archive, so the result must not carry a prototype
	const result: Record<string, Buffer> = Object.create(null);
	let totalSize = 0;

	for (const entry of entries) {
		const budget = maxOutputSize - totalSize;
		if (entry.declaredSize !== undefined && entry.declaredSize > budget) {
			throw new DecompressedSizeExceededError(maxOutputSize);
		}

		const bytes = await extractEntry(data, entry, budget, maxOutputSize);
		totalSize += bytes.length;
		result[entry.name] = bytes;
	}

	return result;
}

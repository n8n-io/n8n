import * as fflate from 'fflate';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UserError } from 'n8n-workflow';

import { BoundedOutputAccumulator } from './BoundedOutputAccumulator';
import { DecompressedSizeExceededError } from './DecompressedSizeExceededError';
import { feedInChunks } from './FeedInChunks';
import { DEFLATED, readCentralDirectory, STORED, type ZipEntry } from './ZipCentralDirectory';

/** Above this compressed size an entry is inflated off the main thread. */
const ASYNC_INFLATE_THRESHOLD = 512 * 1024;

interface Inflater {
	push: (chunk: Uint8Array, isFinal: boolean) => void;
	terminate: () => void;
}

/** Hides the differing callback shapes of fflate's worker and in-process inflaters. */
function createInflater(useWorker: boolean, onData: fflate.AsyncFlateStreamHandler): Inflater {
	if (useWorker) {
		const worker = new fflate.AsyncInflate(onData);
		return {
			push: (chunk, isFinal) => worker.push(chunk, isFinal),
			terminate: () => worker.terminate(),
		};
	}

	const inflater = new fflate.Inflate((chunk, isFinal) => onData(null, chunk, isFinal));
	return { push: (chunk, isFinal) => inflater.push(chunk, isFinal), terminate: () => {} };
}

/**
 * Inflates deflated bytes, stopping as soon as the output passes `budget` so an
 * entry can never produce more than the caller allows, whatever the archive
 * declared. `maxOutputSize` is only used to phrase the error.
 */
async function inflateBounded(
	compressed: Buffer,
	budget: number,
	maxOutputSize: number,
): Promise<Buffer> {
	return await new Promise<Buffer>((resolve, reject) => {
		const outputAccumulator = new BoundedOutputAccumulator(budget);
		let settled = false;

		const inflater = createInflater(
			compressed.length >= ASYNC_INFLATE_THRESHOLD,
			(error, chunk, final) => {
				if (error) {
					rejectOnce(error);
					return;
				}

				if (outputAccumulator.write(chunk)) {
					rejectOnce(new DecompressedSizeExceededError(maxOutputSize));
					return;
				}

				if (final) {
					settled = true;
					resolve(outputAccumulator.combineChunksToBuffer());
				}
			},
		);

		function rejectOnce(error: Error) {
			if (settled) return;
			settled = true;
			inflater.terminate();
			reject(error);
		}

		try {
			feedInChunks({
				data: compressed,
				push: (slice, isFinal) => inflater.push(new Uint8Array(slice), isFinal),
				shouldStop: () => settled,
			});
		} catch (error) {
			rejectOnce(ensureError(error));
		}
	});
}

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

	return await inflateBounded(compressed, budget, maxOutputSize);
}

/**
 * Decompress a zip archive with upper bounds on total output size and number of
 * entries.
 *
 * The bound is enforced against the bytes actually produced, not against the
 * sizes the archive declares for itself. A declared size is still consulted
 * first, so an entry that admits to being oversized costs nothing to reject,
 * but it is never the last word: archives that overstate a size (an unresolved
 * ZIP64 sentinel, say) must not fail, and archives that understate one must not
 * yield a silently truncated member.
 */
export async function boundedUnzip(
	data: Buffer,
	maxOutputSize: number,
	maxEntries: number,
): Promise<Record<string, Buffer>> {
	// ZIP spec mandates '/' as path separator; a trailing slash marks a directory
	const entries = readCentralDirectory(data).filter((entry) => !entry.name.endsWith('/'));
	if (entries.length > maxEntries) {
		throw new UserError(`The archive contains more than ${maxEntries} entries`);
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

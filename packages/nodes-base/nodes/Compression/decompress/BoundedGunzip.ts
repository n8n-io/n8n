import * as fflate from 'fflate';
import { ensureError } from 'n8n-workflow';

import { DecompressedSizeExceededError } from './DecompressedSizeExceededError';
import { feedInChunks } from './FeedInChunks';
import { GunzipOutputAccumulator } from './GunzipOutputAccumulator';

// A gzip member begins with the two magic bytes and a 10-byte fixed header
// (RFC 1952). fflate's streaming gunzip tolerates a truncated header by yielding
// empty output; reject such input up front so truncated/empty data is reported
// as invalid rather than silently decompressing to nothing.
const GZIP_HEADER_SIZE = 10;
const GZIP_MAGIC = [0x1f, 0x8b];

/**
 * Decompress gzip data with an upper bound on total output size.
 * Uses fflate's asynchronous stream so decompression happens off the main thread.
 */
export async function boundedGunzip(data: Buffer, maxOutputSize: number): Promise<Buffer> {
	return await new Promise<Buffer>((resolve, reject) => {
		if (data.length < GZIP_HEADER_SIZE || data[0] !== GZIP_MAGIC[0] || data[1] !== GZIP_MAGIC[1]) {
			reject(new Error('invalid gzip data'));
			return;
		}

		const outputAccumulator = new GunzipOutputAccumulator(maxOutputSize);
		let settled = false;

		const decompressor = new fflate.AsyncGunzip((error, chunk, final) => {
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
		});

		function rejectOnce(error: Error) {
			if (settled) return;
			settled = true;
			decompressor.terminate();
			reject(error);
		}

		try {
			feedInChunks({
				data,
				push: (slice, isFinal) => decompressor.push(new Uint8Array(slice), isFinal),
				shouldStop: () => settled,
			});
		} catch (error) {
			rejectOnce(ensureError(error));
		}
	});
}

import * as fflate from 'fflate';
import { ensureError } from 'n8n-workflow';

import { DecompressedSizeExceededError } from './DecompressedSizeExceededError';
import { feedInChunks } from './FeedInChunks';
import { GunzipOutputAccumulator } from './GunzipOutputAccumulator';

/**
 * Decompress gzip data with an upper bound on total output size.
 * Uses fflate's asynchronous stream so decompression happens off the main thread.
 */
export async function boundedGunzip(data: Buffer, maxOutputSize: number): Promise<Buffer> {
	return await new Promise<Buffer>((resolve, reject) => {
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

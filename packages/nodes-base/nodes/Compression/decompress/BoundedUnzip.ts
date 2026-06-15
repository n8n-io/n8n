import * as fflate from 'fflate';
import { ensureError } from 'n8n-workflow';

import { feedInChunks } from './FeedInChunks';
import { ZipEntryDecompressor } from './ZipEntryDecompressor';
import { ZipOutputAccumulator } from './ZipOutputAccumulator';

/**
 * Decompress a zip archive with upper bounds on total output size
 * and number of entries. Uses fflate's asynchronous inflate decoder for entries.
 */
export async function boundedUnzip(
	data: Buffer,
	maxOutputSize: number,
	maxEntries: number,
): Promise<Record<string, Buffer>> {
	validateZipArchive(data);

	return await new Promise<Record<string, Buffer>>((resolve, reject) => {
		const zipOutputAccumulator = new ZipOutputAccumulator(maxOutputSize, maxEntries);
		let inputFinished = false;
		let pendingEntries = 0;
		let isSettled = false;

		const rejectOnce = (error: Error) => {
			if (isSettled) return;
			isSettled = true;
			reject(error);
		};

		const resolveIfDone = () => {
			if (isSettled || !inputFinished || pendingEntries > 0) return;
			isSettled = true;
			resolve(zipOutputAccumulator.toBuffers());
		};

		const unzipper = new fflate.Unzip((fileOrDirectory) => {
			if (isSettled || zipOutputAccumulator.isLimitExceeded) return;
			// ZIP spec mandates '/' as path separator on all platforms
			if (fileOrDirectory.name.endsWith('/')) return;

			const entryResult = zipOutputAccumulator.addEntry(fileOrDirectory.name);
			if (!entryResult.ok) {
				rejectOnce(entryResult.error);
				return;
			}
			const writeChunk = entryResult.result;

			pendingEntries++;
			new ZipEntryDecompressor(fileOrDirectory, writeChunk, zipOutputAccumulator, {
				isSettled: () => isSettled,
				onFinish: () => {
					pendingEntries--;
					resolveIfDone();
				},
				onError: rejectOnce,
			}).start();
		});

		unzipper.register(fflate.AsyncUnzipInflate);

		try {
			feedInChunks({
				data,
				push: (slice, isFinal) => {
					unzipper.push(slice, isFinal);
				},
				shouldStop: () => isSettled || zipOutputAccumulator.isLimitExceeded,
			});
			inputFinished = true;
			if (zipOutputAccumulator.isLimitExceeded) {
				rejectOnce(zipOutputAccumulator.exceededError);
				return;
			}
			resolveIfDone();
		} catch (error) {
			rejectOnce(ensureError(error));
		}
	});
}

function validateZipArchive(data: Buffer): void {
	try {
		// Parse archive metadata without inflating entries; the streaming reader
		// does not validate the central directory before resolving.
		void fflate.unzipSync(data, { filter: () => false });
	} catch (error) {
		throw ensureError(error);
	}
}

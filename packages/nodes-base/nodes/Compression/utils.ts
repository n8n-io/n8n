import * as fflate from 'fflate';
import { UserError } from 'n8n-workflow';

import { OutputAccumulator } from './OutputAccumulator';
import { ZipOutputAccumulator } from './ZipOutputAccumulator';

const CHUNK_SIZE = 65_536; // 64 KB

/**
 * Decompress gzip data with an upper bound on total output size.
 * Uses fflate's asynchronous stream so decompression happens off the main thread.
 */
export async function boundedGunzip(data: Buffer, maxOutputSize: number): Promise<Buffer> {
	return await new Promise<Buffer>((resolve, reject) => {
		const outputAccumulator = new OutputAccumulator(maxOutputSize);
		let settled = false;

		const decompressor = new fflate.AsyncGunzip((error, chunk, final) => {
			if (error) {
				rejectOnce(error);
				return;
			}

			if (outputAccumulator.write(chunk)) {
				rejectOnce(makeDecompressedSizeError(maxOutputSize));
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
			rejectOnce(toError(error));
		}
	});
}

/**
 * Decompress a zip archive with upper bounds on total output size
 * and number of entries. Uses fflate's asynchronous inflate decoder for entries.
 */
export async function boundedUnzip(
	data: Buffer,
	maxOutputSize: number,
	maxEntries: number,
): Promise<Record<string, Buffer>> {
	return await new Promise<Record<string, Buffer>>((resolve, reject) => {
		const outputAccumulator = new ZipOutputAccumulator(maxOutputSize, maxEntries);
		let inputFinished = false;
		let pendingEntries = 0;
		let settled = false;

		const rejectOnce = (error: Error) => {
			if (settled) return;
			settled = true;
			reject(error);
		};

		const resolveIfDone = () => {
			if (settled || !inputFinished || pendingEntries > 0) return;
			settled = true;
			resolve(outputAccumulator.toBuffers());
		};

		const unzipper = new fflate.Unzip((fileOrDirectory) => {
			if (settled || outputAccumulator.exceeded) return;
			// ZIP spec mandates '/' as path separator on all platforms
			if (fileOrDirectory.name.endsWith('/')) return;

			const writeChunk = outputAccumulator.addEntry(fileOrDirectory.name);
			if (!writeChunk) {
				rejectOnce(outputAccumulator.toError());
				return;
			}

			pendingEntries++;
			let entryFinished = false;

			const finishEntry = () => {
				if (entryFinished) return;
				entryFinished = true;
				pendingEntries--;
				resolveIfDone();
			};

			const rejectEntry = (error: unknown) => {
				fileOrDirectory.terminate();
				rejectOnce(makeZipEntryError(fileOrDirectory.name, error));
			};

			fileOrDirectory.ondata = (error, chunk, final) => {
				if (settled) return;
				if (error) {
					rejectEntry(error);
					return;
				}

				writeChunk(chunk);

				if (outputAccumulator.exceeded) {
					fileOrDirectory.terminate();
					rejectOnce(outputAccumulator.toError());
					return;
				}

				if (final) finishEntry();
			};

			try {
				fileOrDirectory.start();
			} catch (error) {
				rejectEntry(error);
			}
		});

		unzipper.register(fflate.AsyncUnzipInflate);

		try {
			feedInChunks({
				data,
				push: (slice, isFinal) => unzipper.push(slice, isFinal),
				shouldStop: () => settled || outputAccumulator.exceeded,
			});
			inputFinished = true;
			if (outputAccumulator.exceeded) {
				rejectOnce(outputAccumulator.toError());
				return;
			}
			resolveIfDone();
		} catch (error) {
			rejectOnce(toError(error));
		}
	});
}

/** Feeds a buffer to a consumer in fixed-size slices. */
function feedInChunks(options: {
	data: Buffer;
	push: (slice: Uint8Array, isFinal: boolean) => void;
	shouldStop: () => boolean;
}): void {
	const { data, push, shouldStop } = options;
	for (let offset = 0; offset < data.length && !shouldStop(); offset += CHUNK_SIZE) {
		const end = Math.min(offset + CHUNK_SIZE, data.length);
		push(data.subarray(offset, end), end === data.length);
	}
}

function makeDecompressedSizeError(maxOutputSize: number): UserError {
	const limitMb = Math.round(maxOutputSize / (1024 * 1024));
	return new UserError(`The decompressed output exceeds the maximum allowed size of ${limitMb} MB`);
}

function makeZipEntryError(fileName: string, error: unknown): UserError {
	const message = toErrorMessage(error);
	return new UserError(
		`ZIP entry "${fileName}" couldn't be decompressed. Check the archive and try again. Original error: ${message}`,
		error instanceof Error ? { cause: error } : {},
	);
}

function toError(error: unknown): Error {
	if (error instanceof Error) return error;
	return new Error(toErrorMessage(error));
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

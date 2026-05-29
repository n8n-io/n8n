import * as fflate from 'fflate';
import { UserError } from 'n8n-workflow';

import { OutputAccumulator } from './OutputAccumulator';
import { ZipOutputAccumulator } from './ZipOutputAccumulator';

const CHUNK_SIZE = 65_536; // 64 KB

const yieldToEventLoop = async () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * Decompress gzip data with an upper bound on total output size.
 * Feeds compressed input in small chunks, yielding to the event loop
 * between chunks so the server stays responsive during large files.
 */
export async function boundedGunzip(data: Buffer, maxOutputSize: number): Promise<Buffer> {
	const outputAccumulator = new OutputAccumulator(maxOutputSize);
	const decompressor = new fflate.Gunzip((chunk) => outputAccumulator.write(chunk));

	await feedInChunks({
		data,
		push: (slice, isFinal) => decompressor.push(slice, isFinal),
		shouldStop: () => outputAccumulator.exceeded,
	});

	if (outputAccumulator.exceeded) throw makeDecompressedSizeError(maxOutputSize);
	return outputAccumulator.toBuffer();
}

/**
 * Decompress a zip archive with upper bounds on total output size
 * and number of entries. Feeds compressed input in small chunks,
 * yielding to the event loop between chunks.
 */
export async function boundedUnzip(
	data: Buffer,
	maxOutputSize: number,
	maxEntries: number,
): Promise<Record<string, Buffer>> {
	const outputAccumulator = new ZipOutputAccumulator(maxOutputSize, maxEntries);

	const unzipper = new fflate.Unzip((fileOrDirectory) => {
		if (outputAccumulator.exceeded) return;
		// ZIP spec mandates '/' as path separator on all platforms
		if (fileOrDirectory.name.endsWith('/')) return;

		const writeChunk = outputAccumulator.addEntry(fileOrDirectory.name);
		if (!writeChunk) return;

		fileOrDirectory.ondata = (_err, chunk, _final) => writeChunk(chunk);
		fileOrDirectory.start();
	});

	unzipper.register(fflate.UnzipInflate);

	await feedInChunks({
		data,
		push: (slice, isFinal) => unzipper.push(slice, isFinal),
		shouldStop: () => outputAccumulator.exceeded,
	});

	if (outputAccumulator.exceeded) throw outputAccumulator.toError();
	return outputAccumulator.toBuffers();
}

/** Feeds a buffer to a consumer in fixed-size slices, yielding to the event loop between chunks. */
async function feedInChunks(options: {
	data: Buffer;
	push: (slice: Uint8Array, isFinal: boolean) => void;
	shouldStop: () => boolean;
}): Promise<void> {
	const { data, push, shouldStop } = options;
	for (let offset = 0; offset < data.length && !shouldStop(); offset += CHUNK_SIZE) {
		const end = Math.min(offset + CHUNK_SIZE, data.length);
		push(data.subarray(offset, end), end === data.length);
		if (!shouldStop()) await yieldToEventLoop();
	}
}

function makeDecompressedSizeError(maxOutputSize: number): UserError {
	const limitMb = Math.round(maxOutputSize / (1024 * 1024));
	return new UserError(`The decompressed output exceeds the maximum allowed size of ${limitMb} MB`);
}

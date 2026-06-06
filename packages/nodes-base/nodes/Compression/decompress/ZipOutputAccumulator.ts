import { createResultError, createResultOk, type Result, UserError } from 'n8n-workflow';
import assert from 'node:assert';

import { DecompressedSizeExceededError } from './DecompressedSizeExceededError';

/**
 * Tracks per-file decompressed chunks across a zip archive while enforcing
 * a shared cumulative size limit and a maximum entry count.
 */
export class ZipOutputAccumulator {
	error: UserError | undefined = undefined;

	private totalSize = 0;

	private entryCount = 0;

	private readonly fileChunksByName: Record<string, Uint8Array[]> = {};

	constructor(
		private readonly maxSize: number,
		private readonly maxEntries: number,
	) {}

	get exceededError(): UserError {
		assert(this.error);
		return this.error;
	}

	get isLimitExceeded(): boolean {
		return this.error !== undefined;
	}

	/** Registers a new zip entry and returns a chunk writer, or an error if a limit was hit. */
	addEntry(name: string): Result<(chunk: Uint8Array) => void, UserError> {
		if (this.error) return createResultError(this.error);

		this.entryCount++;
		if (this.entryCount > this.maxEntries) {
			this.error = new UserError(`The archive contains more than ${this.maxEntries} entries`);
			return createResultError(this.error);
		}

		const chunks: Uint8Array[] = [];
		this.fileChunksByName[name] = chunks;

		return createResultOk((chunk: Uint8Array) => {
			if (this.isLimitExceeded) return;
			this.totalSize += chunk.length;
			if (this.totalSize > this.maxSize) {
				this.error = new DecompressedSizeExceededError(this.maxSize);
				return;
			}
			chunks.push(chunk.slice());
		});
	}

	toBuffers(): Record<string, Buffer> {
		const result: Record<string, Buffer> = {};
		for (const [name, chunks] of Object.entries(this.fileChunksByName)) {
			result[name] = Buffer.concat(chunks);
		}
		return result;
	}
}

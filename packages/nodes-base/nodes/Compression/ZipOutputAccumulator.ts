import { UserError } from 'n8n-workflow';

/**
 * Tracks per-file decompressed chunks across a zip archive while enforcing
 * a shared cumulative size limit and a maximum entry count.
 */
export class ZipOutputAccumulator {
	exceeded = false;

	exceededReason = '';

	private totalSize = 0;

	private entryCount = 0;

	private readonly fileChunksByName: Record<string, Uint8Array[]> = {};

	constructor(
		private readonly maxSize: number,
		private readonly maxEntries: number,
	) {}

	addEntry(name: string): ((chunk: Uint8Array) => void) | undefined {
		if (this.exceeded) return undefined;

		this.entryCount++;
		if (this.entryCount > this.maxEntries) {
			this.exceeded = true;
			this.exceededReason = `The archive contains more than ${this.maxEntries} entries`;
			return undefined;
		}

		const chunks: Uint8Array[] = [];
		this.fileChunksByName[name] = chunks;

		return (chunk: Uint8Array) => {
			if (this.exceeded) return;
			this.totalSize += chunk.length;
			if (this.totalSize > this.maxSize) {
				this.exceeded = true;
				const limitMb = Math.round(this.maxSize / (1024 * 1024));
				this.exceededReason = `The decompressed output exceeds the maximum allowed size of ${limitMb} MB`;
				return;
			}
			chunks.push(chunk.slice());
		};
	}

	toBuffers(): Record<string, Buffer> {
		const result: Record<string, Buffer> = {};
		for (const [name, chunks] of Object.entries(this.fileChunksByName)) {
			result[name] = Buffer.concat(chunks);
		}
		return result;
	}

	toError(): UserError {
		return new UserError(this.exceededReason);
	}
}

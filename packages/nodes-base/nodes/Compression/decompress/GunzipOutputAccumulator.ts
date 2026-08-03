/**
 * Tracks decompressed output chunks while enforcing a cumulative size limit.
 * fflate reuses its internal buffer between callbacks, so every chunk is
 * copied via `slice()` before being stored.
 */
export class GunzipOutputAccumulator {
	readonly chunks: Uint8Array[] = [];

	exceeded = false;

	private totalSize = 0;

	constructor(private readonly maxSize: number) {}

	/** Appends a chunk and returns `true` if the cumulative size now exceeds the limit. */
	write(chunk: Uint8Array): boolean {
		if (this.exceeded) return this.exceeded;
		this.totalSize += chunk.length;
		if (this.totalSize > this.maxSize) {
			this.exceeded = true;
			return this.exceeded;
		}
		this.chunks.push(chunk.slice());
		return this.exceeded;
	}

	combineChunksToBuffer(): Buffer {
		return Buffer.concat(this.chunks);
	}
}

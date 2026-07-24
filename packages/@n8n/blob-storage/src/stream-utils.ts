import { UnexpectedError } from 'n8n-workflow';
import { Transform } from 'node:stream';

/** Throws unless `chunkSize` is a positive integer. */
export function assertChunkSize(chunkSize: number): void {
	if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
		throw new UnexpectedError(`chunkSize must be a positive integer, got ${chunkSize}`);
	}
}

/**
 * A `Transform` that re-emits its input as chunks of exactly `chunkSize` bytes, with a possibly smaller final chunk.
 * `chunkSize` must be a positive integer: values `<= 0` throws an `UnexpectedError`.
 *
 * Between transforms the internal queue carries at most one partial chunk (< `chunkSize` bytes).
 *
 * Wire the upstream source into the chunker with `node:stream.pipeline()`, not plain `.pipe()`.
 * `pipeline()` propagates errors from upstream to the chunker
 * (so consumers see them) and propagates destroy from the chunker to upstream
 * (so sockets don't dangle when the consumer aborts).
 * `.pipe()` does neither.
 */
export function createFixedSizeChunker(chunkSize: number): Transform {
	assertChunkSize(chunkSize);

	const queue: Buffer[] = [];
	let queued = 0;

	const take = (size: number): Buffer => {
		const out = Buffer.allocUnsafe(size);
		let written = 0;
		while (written < size) {
			const head = queue[0];
			const need = size - written;
			if (head.length <= need) {
				head.copy(out, written);
				written += head.length;
				queue.shift();
			} else {
				head.copy(out, written, 0, need);
				queue[0] = head.subarray(need);
				written += need;
			}
		}
		queued -= size;
		return out;
	};

	return new Transform({
		transform(chunk: Buffer, _encoding, done) {
			queue.push(chunk);
			queued += chunk.length;
			while (queued >= chunkSize) {
				this.push(take(chunkSize));
			}
			done();
		},
		flush(done) {
			if (queued > 0) {
				this.push(take(queued));
			}
			done();
		},
		destroy(error, done) {
			queue.length = 0;
			queued = 0;
			done(error);
		},
	});
}

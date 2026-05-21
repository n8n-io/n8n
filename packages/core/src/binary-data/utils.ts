import { UnexpectedError } from 'n8n-workflow';
import { Transform, type Readable } from 'node:stream';

import type { BinaryData } from './types';

export { assertDir, exists } from '@n8n/backend-common';

const STORED_MODES = ['filesystem', 'filesystem-v2', 's3', 'database'] as const;

export function isStoredMode(mode: string): mode is BinaryData.StoredMode {
	return STORED_MODES.includes(mode as BinaryData.StoredMode);
}

/** Converts a readable stream to a buffer */
export async function streamToBuffer(stream: Readable) {
	return await new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		stream.on('data', (chunk: Buffer) => chunks.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(chunks)));
		stream.once('error', (cause) => {
			if ('code' in cause && cause.code === 'Z_DATA_ERROR')
				reject(new UnexpectedError('Failed to decompress response', { cause }));
			else reject(cause);
		});
	});
}

/** Converts a buffer or a readable stream to a buffer */
export async function binaryToBuffer(body: Buffer | Readable) {
	if (Buffer.isBuffer(body)) return body;
	return await streamToBuffer(body);
}

/**
 * A `Transform` that re-emits its input as chunks of exactly `chunkSize` bytes, with a possibly smaller final chunk.
 *
 * Memory use is bounded by `chunkSize` (one queued part at a time), so it is safe to wrap unbounded streams.
 *
 * Wire the upstream source into the chunker with `node:stream.pipeline()`, not plain `.pipe()`.
 * `pipeline()` propagates errors from upstream to the chunker
 * (so consumers see them) and propagates destroy from the chunker to upstream
 * (so sockets don't dangle when the consumer aborts).
 * `.pipe()` does neither.
 */
export function createFixedSizeChunker(chunkSize: number): Transform {
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

export const FileLocation = {
	ofExecution: (workflowId: string, executionId: string): BinaryData.FileLocation => ({
		type: 'execution',
		workflowId,
		executionId,
	}),

	/**
	 * Create a location for a binary file at a custom path,
	 * e.g. ["chat-hub", "sessions", "abc", "messages", "def"] -> "chat-hub/sessions/abc/messages/def"
	 */
	ofCustom: ({
		pathSegments,
		sourceType,
		sourceId,
	}: {
		pathSegments: string[];
		sourceType?: string;
		sourceId?: string;
	}): BinaryData.FileLocation => ({
		type: 'custom',
		pathSegments,
		sourceType,
		sourceId,
	}),
};

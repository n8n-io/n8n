import { HttpRequestConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import type { Readable } from 'stream';

function toStreamError(cause: Error & { code?: string }): Error {
	return cause.code === 'Z_DATA_ERROR'
		? new UnexpectedError('Failed to decompress response', { cause })
		: cause;
}

function normalizeChunk(chunk: unknown): Buffer | undefined {
	if (Buffer.isBuffer(chunk)) {
		return chunk;
	}
	if (typeof chunk === 'string') {
		return Buffer.from(chunk);
	}
	if (chunk instanceof Uint8Array) {
		return Buffer.from(chunk);
	}
	return undefined;
}

/**
 * Collects bytes still buffered on a Readable stream without waiting on events.
 */
function flushBufferedChunks(stream: Readable): Buffer {
	const chunks: Buffer[] = [];
	try {
		let chunk: unknown;
		while ((chunk = stream.read()) !== null) {
			const normalized = normalizeChunk(chunk);
			if (normalized) {
				chunks.push(normalized);
			}
		}
	} catch {
		// Return whatever chunks we already collected.
	}
	return Buffer.concat(chunks);
}

async function drainStream(
	stream: Readable,
	idleTimeoutMs: number | undefined,
	chunks: Buffer[],
): Promise<Buffer> {
	// A stream can arrive already ended, errored, or closed. Late listeners do
	// not fire on a settled stream, so reject immediately from its current
	// state instead of waiting for the idle timer.
	if (stream.errored) {
		// destroy(err) emits 'error' on the next tick. Attach a listener if none
		// exists so throwing here does not leave an unhandled error event.
		if (stream.listenerCount('error') === 0) {
			stream.once('error', () => {});
		}
		throw toStreamError(stream.errored);
	}
	if (stream.readableEnded) {
		throw new UnexpectedError('Stream already consumed');
	}
	if (stream.destroyed || stream.closed) {
		throw new UnexpectedError('Stream closed before completing');
	}

	const timeout = idleTimeoutMs ?? Container.get(HttpRequestConfig).responseBodyReadTimeout;
	const useTimer = Number.isFinite(timeout) && timeout > 0;

	return await new Promise<Buffer>((resolve, reject) => {
		let settled = false;
		let timer: NodeJS.Timeout | undefined;

		const clearTimer = () => {
			if (timer) clearTimeout(timer);
			timer = undefined;
		};
		const armTimer = () => {
			if (!useTimer) return;
			clearTimer();
			timer = setTimeout(() => {
				stream.destroy();
				settle(() =>
					reject(new UnexpectedError(`Response body timed out after ${timeout}ms without data`)),
				);
			}, timeout);
			// Don't let the watchdog keep the event loop alive on its own.
			timer.unref?.();
		};

		const onData = (chunk: unknown) => {
			const normalized = normalizeChunk(chunk);
			if (normalized) {
				chunks.push(normalized);
			}
			armTimer();
		};
		const onEnd = () => settle(() => resolve(Buffer.concat(chunks)));
		const onError = (cause: Error & { code?: string }) =>
			settle(() => reject(toStreamError(cause)));
		// A stream that closes without a clean 'end' (half-open socket, truncated
		// body) emits 'close' but neither 'end' nor 'error'. Without this exit the
		// promise would never settle and the caller would hang indefinitely.
		const onClose = () =>
			settle(() => reject(new UnexpectedError('Stream closed before completing')));

		function settle(action: () => void) {
			if (settled) return;
			settled = true;
			clearTimer();
			stream.off('data', onData);
			stream.off('end', onEnd);
			stream.off('error', onError);
			stream.off('close', onClose);
			action();
		}

		stream.on('data', onData);
		stream.once('end', onEnd);
		stream.once('error', onError);
		stream.once('close', onClose);
		armTimer();
	});
}

/**
 * Converts a readable stream to a buffer, rejecting if the stream stalls.
 *
 * The inactivity timeout exists because a request `timeout` only covers the
 * response headers, leaving a never-terminating body able to hang the caller
 * forever. It resets on each chunk (so a slow-but-progressing download isn't
 * cut off) — meaning it bounds inactivity, not total read time; a stream that
 * keeps trickling data is intentionally not capped. `idleTimeoutMs` defaults to
 * `HttpRequestConfig.responseBodyReadTimeout`.
 */
export async function streamToBuffer(stream: Readable, idleTimeoutMs?: number): Promise<Buffer> {
	return await drainStream(stream, idleTimeoutMs, []);
}

/**
 * Best-effort stream drain for HTTP error responses.
 * Returns all bytes received before failure plus any unread bytes still
 * buffered on the stream so the caller keeps available error details.
 */
export async function streamToBufferPartial(
	stream: Readable,
	idleTimeoutMs?: number,
): Promise<Buffer> {
	const chunks: Buffer[] = [];
	try {
		return await drainStream(stream, idleTimeoutMs, chunks);
	} catch {
		const remaining = flushBufferedChunks(stream);
		if (remaining.length > 0) {
			chunks.push(remaining);
		}
		return Buffer.concat(chunks);
	}
}

/** Converts a buffer or a readable stream to a buffer */
export async function binaryToBuffer(body: Buffer | Readable): Promise<Buffer> {
	if (Buffer.isBuffer(body)) return body;
	return await streamToBuffer(body);
}

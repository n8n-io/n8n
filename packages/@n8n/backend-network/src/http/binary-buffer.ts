import { HttpRequestConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import type { Readable } from 'stream';

/** Drain any bytes still sitting in the Readable's internal buffer. */
function flushBufferedChunks(stream: Readable): Buffer {
	const chunks: Buffer[] = [];
	let chunk: unknown;
	while ((chunk = stream.read()) !== null) {
		if (Buffer.isBuffer(chunk)) {
			chunks.push(chunk);
		} else if (typeof chunk === 'string') {
			chunks.push(Buffer.from(chunk));
		} else if (chunk instanceof Uint8Array) {
			chunks.push(Buffer.from(chunk));
		}
	}
	return Buffer.concat(chunks);
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
 *
 * Axios can also hand back a stream that is already `destroyed`/`closed`
 * (typical for HTTPS CONNECT proxy errors with `responseType: 'stream'`). In
 * that case no further `end`/`error`/`close` events fire, so we must settle
 * from the stream's current state instead of waiting on listeners.
 */
export async function streamToBuffer(stream: Readable, idleTimeoutMs?: number): Promise<Buffer> {
	// Axios error responses with responseType:'stream' often arrive already
	// destroyed/closed (e.g. a proxy CONNECT 403 whose Content-Length was never
	// satisfied). Late 'end'/'close' listeners never fire — without this check
	// we'd only escape via the inactivity timeout (default 5 minutes). Return
	// whatever is still buffered so callers can surface the HTTP status + body.
	if (stream.readableEnded || stream.destroyed || stream.closed) {
		return flushBufferedChunks(stream);
	}

	const timeout = idleTimeoutMs ?? Container.get(HttpRequestConfig).responseBodyReadTimeout;
	const useTimer = Number.isFinite(timeout) && timeout > 0;

	return await new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
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

		const onData = (chunk: Buffer) => {
			chunks.push(chunk);
			armTimer();
		};
		const onEnd = () => settle(() => resolve(Buffer.concat(chunks)));
		const onError = (cause: Error & { code?: string }) =>
			settle(() =>
				reject(
					cause.code === 'Z_DATA_ERROR'
						? new UnexpectedError('Failed to decompress response', { cause })
						: cause,
				),
			);
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

/** Converts a buffer or a readable stream to a buffer */
export async function binaryToBuffer(body: Buffer | Readable): Promise<Buffer> {
	if (Buffer.isBuffer(body)) return body;
	return await streamToBuffer(body);
}

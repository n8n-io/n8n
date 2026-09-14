import { HttpRequestConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import type { Readable } from 'stream';

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

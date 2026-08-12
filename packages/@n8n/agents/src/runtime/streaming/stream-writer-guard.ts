import type { FinishReason, StreamChunk } from '../../types';
import type { TokenUsage } from '../../types/sdk/agent';

/**
 * Wraps a stream writer so the runtime has a single, idempotent shutdown path.
 *
 * - `write()` becomes a no-op once the stream is closed and never rejects, so a
 *   late chunk from an aborted/errored run cannot crash the loop.
 * - `close()` and `fail()` are idempotent, removing the double-close / write-
 *   after-close hazards that came from the previous multiple close sites.
 */
export class StreamWriterGuard {
	private closed = false;

	constructor(private readonly writer: WritableStreamDefaultWriter<StreamChunk>) {
		writer.closed
			.then(() => {
				this.closed = true;
			})
			.catch(() => {});
	}

	get isClosed(): boolean {
		return this.closed;
	}

	/** Write a chunk unless the stream is already closed. Never throws. */
	async write(chunk: StreamChunk): Promise<void> {
		if (this.closed) return;
		try {
			await this.writer.write(chunk);
		} catch {
			// Downstream consumer is gone (cancelled/errored). Nothing useful to do.
		}
	}

	/** Close the stream exactly once. Never throws. */
	async close(): Promise<void> {
		if (this.closed) return;
		this.closed = true;
		try {
			await this.writer.close();
		} catch {
			// Already errored/closed by the downstream side.
		}
	}

	/**
	 * Terminate the stream with an error: emit an `error` chunk and a terminal
	 * `finish` chunk, then close. Idempotent — a no-op if already closed.
	 *
	 * `finish` enriches the terminal chunk with usage/model so an aborted run
	 * still carries the tokens consumed before the stop.
	 */
	async fail(
		error: unknown,
		finishReason: FinishReason = 'error',
		finish?: { usage?: TokenUsage; model?: string },
	): Promise<void> {
		if (this.closed) return;
		await this.write({ type: 'error', error });
		await this.write({ type: 'finish', finishReason, ...finish });
		await this.close();
	}
}

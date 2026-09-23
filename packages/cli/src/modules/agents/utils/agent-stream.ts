import type { StreamChunk } from '@n8n/agents';

/** Bounds the abort path of a stopped run: its memory writes, checkpoint cleanup, and usage. */
export const STOPPED_RUN_DRAIN_TIMEOUT_MS = 10_000;

export interface StopRunOnEarlyExit {
	abortRun: () => void;
	/** Receives the chunks that the stopped run still writes, such as its final usage. */
	onDrainedChunk?: (chunk: StreamChunk) => void;
}

/**
 * Yields the chunks of an agent run. When the consumer stops early, `stopRun`
 * aborts the run and reads it to its end, so the run stops before the caller
 * settles the turn and releases its session. Without `stopRun`, the reader is
 * cancelled.
 */
export async function* streamAgentChunks(
	stream: ReadableStream<StreamChunk>,
	stopRun?: StopRunOnEarlyExit,
): AsyncGenerator<StreamChunk> {
	const reader = stream.getReader();
	// True only while a chunk waits for the consumer. A stream that errored or
	// ended needs no stop.
	let waitingForConsumer = false;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			waitingForConsumer = true;
			yield value;
			waitingForConsumer = false;
		}
	} finally {
		try {
			if (waitingForConsumer) await closeEarly(reader, stopRun);
		} finally {
			reader.releaseLock();
		}
	}
}

async function closeEarly(
	reader: ReadableStreamDefaultReader<StreamChunk>,
	stopRun: StopRunOnEarlyExit | undefined,
): Promise<void> {
	if (!stopRun) {
		await reader.cancel();
		return;
	}
	stopRun.abortRun();
	await drainStoppedRun(reader, stopRun.onDrainedChunk);
}

/** Reads a stopped run until it closes its stream. Cancels the reader after the timeout. */
async function drainStoppedRun(
	reader: ReadableStreamDefaultReader<StreamChunk>,
	onDrainedChunk: StopRunOnEarlyExit['onDrainedChunk'],
): Promise<void> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<'timeout'>((resolve) => {
		timer = setTimeout(() => resolve('timeout'), STOPPED_RUN_DRAIN_TIMEOUT_MS);
		timer.unref();
	});
	try {
		for (;;) {
			const result = await Promise.race([reader.read(), timeout]);
			if (result === 'timeout') return await reader.cancel();
			if (result.done) return;
			onDrainedChunk?.(result.value);
		}
	} catch {
		// The stream errored, so the run no longer writes to it.
	} finally {
		clearTimeout(timer);
	}
}

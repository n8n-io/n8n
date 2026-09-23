import type { StreamChunk } from '@n8n/agents';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { STOPPED_RUN_DRAIN_TIMEOUT_MS, streamAgentChunks } from '../agent-stream';

const delta: StreamChunk = { type: 'text-delta', id: 'text-1', delta: 'partial' };
const abortError: StreamChunk = { type: 'error', error: new Error('Agent run was aborted') };
const abortFinish: StreamChunk = {
	type: 'finish',
	finishReason: 'error',
	usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
};

function controllableStream() {
	let controller!: ReadableStreamDefaultController<StreamChunk>;
	const cancel = vi.fn();
	const stream = new ReadableStream<StreamChunk>({
		start(streamController) {
			controller = streamController;
		},
		cancel,
	});
	return { stream, controller, cancel };
}

async function readFirstChunk(chunks: AsyncGenerator<StreamChunk>): Promise<void> {
	for await (const _chunk of chunks) break;
}

describe('streamAgentChunks', () => {
	it('aborts a run whose consumer stops early and reads the run to its end', async () => {
		const { stream, controller, cancel } = controllableStream();
		const runClosed = createDeferredPromise();
		const drained: StreamChunk[] = [];
		// The SDK answers an abort with its terminal chunks, then closes the stream.
		const abortRun = vi.fn(() => {
			void runClosed.promise.then(() => {
				controller.enqueue(abortError);
				controller.enqueue(abortFinish);
				controller.close();
			});
		});
		controller.enqueue(delta);

		let returned = false;
		const consumed = readFirstChunk(
			streamAgentChunks(stream, { abortRun, onDrainedChunk: (chunk) => drained.push(chunk) }),
		).then(() => {
			returned = true;
		});
		await vi.waitFor(() => expect(abortRun).toHaveBeenCalledOnce());
		await new Promise((resolve) => setImmediate(resolve));
		expect(returned).toBe(false);

		runClosed.resolve();
		await consumed;

		expect(drained).toEqual([abortError, abortFinish]);
		expect(cancel).not.toHaveBeenCalled();
	});

	it('cancels the reader when the stopped run does not close its stream in time', async () => {
		vi.useFakeTimers();
		try {
			const { stream, controller, cancel } = controllableStream();
			controller.enqueue(delta);

			const consumed = readFirstChunk(streamAgentChunks(stream, { abortRun: vi.fn() }));
			await vi.advanceTimersByTimeAsync(STOPPED_RUN_DRAIN_TIMEOUT_MS - 1);
			expect(cancel).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			await consumed;

			expect(cancel).toHaveBeenCalledOnce();
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not stop a run whose stream errored', async () => {
		const streamError = new Error('reader failed');
		const stream = new ReadableStream<StreamChunk>({
			pull(controller) {
				controller.error(streamError);
			},
		});
		const abortRun = vi.fn();

		await expect(readFirstChunk(streamAgentChunks(stream, { abortRun }))).rejects.toBe(streamError);

		expect(abortRun).not.toHaveBeenCalled();
	});

	it('cancels the reader when the caller does not stop the run', async () => {
		const { stream, controller, cancel } = controllableStream();
		controller.enqueue(delta);

		await readFirstChunk(streamAgentChunks(stream));

		expect(cancel).toHaveBeenCalledOnce();
	});
});

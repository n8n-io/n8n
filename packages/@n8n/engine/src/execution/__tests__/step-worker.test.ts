import { describe, expect, it, vi } from 'vitest';

import { InMemoryWorkQueue, type StepMessage } from '../../queue';
import type { StepReadyHandler } from '../step-ready-handler';
import { StepWorker } from '../step-worker';

/** Resolves once the handler has been called, since dispatch is asynchronous. */
function makeReadyHandler() {
	let called!: () => void;
	const complete = new Promise<void>((resolve) => (called = resolve));
	const handle = vi.fn().mockImplementation(async () => {
		called();
		await Promise.resolve();
	});
	return { handler: { handle } as unknown as StepReadyHandler, handle, complete };
}

describe('StepWorker', () => {
	it('routes step:ready to the ready handler', async () => {
		const queue = new InMemoryWorkQueue<StepMessage>();
		const { handler, handle, complete } = makeReadyHandler();
		new StepWorker(queue, handler).start();

		const event = { type: 'step:ready', executionId: 'exec-1', stepId: 'step-a' } as const;
		await queue.publish(event);
		await complete;

		expect(handle).toHaveBeenCalledWith(event);
	});

	it('stops consuming when stopped', async () => {
		const queue = new InMemoryWorkQueue<StepMessage>();
		const stop = vi.spyOn(queue, 'stop');
		const { handler } = makeReadyHandler();
		const worker = new StepWorker(queue, handler);
		worker.start();

		await worker.stop();

		expect(stop).toHaveBeenCalled();
	});

	it('rejects a message type it has no handler for', async () => {
		const queue = new InMemoryWorkQueue<StepMessage>();
		const { handler, handle } = makeReadyHandler();
		const consume = vi.spyOn(queue, 'start');
		new StepWorker(queue, handler).start();
		const dispatch = consume.mock.calls[0][0];

		await expect(dispatch({ type: 'step:unknown' } as unknown as StepMessage)).rejects.toThrowError(
			/unimplemented message type/,
		);
		expect(handle).not.toHaveBeenCalled();
	});
});

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
});

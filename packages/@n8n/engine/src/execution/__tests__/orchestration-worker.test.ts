import { describe, expect, it, vi } from 'vitest';

import type { OrchestrationMessage, WorkQueue } from '../../queue';
import type { ExecutionStartHandler } from '../execution-start-handler';
import { OrchestrationWorker } from '../orchestration-worker';
import type { StepSettledHandler } from '../step-settled-handler';

describe('OrchestrationWorker', () => {
	it('drains the settled-step acknowledgements after the queue stops', async () => {
		const queue: WorkQueue<OrchestrationMessage> = {
			publish: vi.fn(),
			start: vi.fn(),
			stop: vi.fn().mockResolvedValue(undefined),
		};
		const settledHandler = {
			handle: vi.fn(),
			drain: vi.fn().mockResolvedValue(undefined),
		} as unknown as StepSettledHandler;
		const worker = new OrchestrationWorker(
			queue,
			{ handle: vi.fn() } as unknown as ExecutionStartHandler,
			settledHandler,
		);

		await worker.stop();

		expect(queue.stop).toHaveBeenCalledOnce();
		expect(settledHandler.drain).toHaveBeenCalledOnce();
		expect(vi.mocked(queue.stop).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(settledHandler.drain).mock.invocationCallOrder[0],
		);
	});
});

import { describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { createInMemoryWorkQueues } from '../in-memory-work-queues';
import type { EngineWorkQueues } from '../work-queue.types';

const silentLogger: EngineLogger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
};

/** Publishes to both queues, whose handlers block until `stop()`. */
async function startBlocked(
	queues: EngineWorkQueues,
	published: { orchestration: number; step: number },
) {
	let release = () => {};
	const blocked = new Promise<void>((resolve) => (release = resolve));
	const orchestrationHandler = vi.fn(async () => await blocked);
	const stepHandler = vi.fn(async () => await blocked);
	queues.orchestration.start(orchestrationHandler);
	queues.step.start(stepHandler);
	for (let n = 0; n < published.orchestration; n++) {
		await queues.orchestration.publish({ type: 'execution:enqueued', executionId: `exec-${n}` });
	}
	for (let n = 0; n < published.step; n++) {
		await queues.step.publish({ type: 'step:ready', executionId: 'exec-1', stepId: `step-${n}` });
	}
	const stop = async () => {
		const stopping = Promise.all([queues.orchestration.stop(), queues.step.stop()]);
		release();
		await stopping;
	};
	return { orchestrationHandler, stepHandler, stop };
}

describe('createInMemoryWorkQueues', () => {
	it('runs up to its own concurrency limit of handlers at once on each queue', async () => {
		const queues = createInMemoryWorkQueues({
			concurrency: { orchestration: 2, step: 3 },
			logger: silentLogger,
		});
		const { orchestrationHandler, stepHandler, stop } = await startBlocked(queues, {
			orchestration: 3,
			step: 4,
		});

		try {
			expect(orchestrationHandler).toHaveBeenCalledTimes(2);
			expect(stepHandler).toHaveBeenCalledTimes(3);
		} finally {
			await stop();
		}
	});

	it('runs one handler at a time on each queue when no concurrency is given', async () => {
		const queues = createInMemoryWorkQueues({ logger: silentLogger });
		const { orchestrationHandler, stepHandler, stop } = await startBlocked(queues, {
			orchestration: 2,
			step: 2,
		});

		try {
			expect(orchestrationHandler).toHaveBeenCalledOnce();
			expect(stepHandler).toHaveBeenCalledOnce();
		} finally {
			await stop();
		}
	});

	it('logs a failed handler through the given logger', async () => {
		const logger = { ...silentLogger, error: vi.fn() };
		const queues = createInMemoryWorkQueues({ logger });
		queues.orchestration.start(async () => await Promise.reject(new Error('failed')));
		queues.step.start(async () => await Promise.reject(new Error('failed')));

		await queues.orchestration.publish({ type: 'execution:enqueued', executionId: 'exec-1' });
		await queues.step.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' });
		await Promise.all([queues.orchestration.stop(), queues.step.stop()]);

		expect(logger.error).toHaveBeenCalledTimes(2);
	});
});

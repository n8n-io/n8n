import { describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { createRedisWorkQueues } from '../redis-work-queues';
import { FakeRedisList } from './fake-redis-list';

class FakeRedisConnection extends FakeRedisList {
	disconnect = vi.fn();
}

const orchestrationKey = 'n8n:engine-v2-queue:orchestration';
const stepKey = 'n8n:engine-v2-queue:step';
const enqueued = JSON.stringify({ type: 'execution:enqueued', executionId: 'exec-1' });
const ready = JSON.stringify({ type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' });

function create(concurrency = { orchestration: 1, step: 1 }, logger?: EngineLogger) {
	const publisher = new FakeRedisConnection();
	const consumers: FakeRedisConnection[] = [];
	const { queues, close } = createRedisWorkQueues({
		publisher,
		createConsumer: () => {
			const consumer = new FakeRedisConnection();
			consumers.push(consumer);
			return consumer;
		},
		keyPrefix: 'n8n',
		concurrency,
		logger,
	});
	return { publisher, consumers, queues, close };
}

/** Starts both queues with handlers that block until `stop()`. Fill their lists before the next await. */
function startBlocked({ queues, consumers }: ReturnType<typeof create>) {
	let release = () => {};
	const blocked = new Promise<void>((resolve) => (release = resolve));
	const orchestrationHandler = vi.fn(async () => await blocked);
	const stepHandler = vi.fn(async () => await blocked);
	queues.orchestration.start(orchestrationHandler);
	queues.step.start(stepHandler);
	const [orchestrationConsumer, stepConsumer] = consumers;
	const stop = async () => {
		// Stop before the release, so that no queue starts a fetch that waits for the block timeout.
		const stopping = Promise.all([queues.orchestration.stop(), queues.step.stop()]);
		release();
		await stopping;
	};
	return { orchestrationConsumer, stepConsumer, orchestrationHandler, stepHandler, stop };
}

describe('createRedisWorkQueues', () => {
	it('publishes each queue to its own list under the key prefix', async () => {
		const { publisher, queues } = create();

		await queues.orchestration.publish({ type: 'execution:enqueued', executionId: 'exec-1' });
		await queues.step.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' });

		expect(publisher.lpush.mock.calls).toEqual([
			[orchestrationKey, enqueued],
			[stepKey, ready],
		]);
	});

	it('consumes each queue from its own list over its own connection', async () => {
		const { orchestrationConsumer, stepConsumer, orchestrationHandler, stepHandler, stop } =
			startBlocked(create());
		orchestrationConsumer.items.push(enqueued);
		stepConsumer.items.push(ready);

		try {
			await vi.waitFor(() => {
				expect(orchestrationHandler).toHaveBeenCalledWith(JSON.parse(enqueued));
				expect(stepHandler).toHaveBeenCalledWith(JSON.parse(ready));
			});
		} finally {
			await stop();
		}

		expect(orchestrationConsumer.brpop.mock.calls.map(([key]) => key)).toEqual([orchestrationKey]);
		expect(stepConsumer.brpop.mock.calls.map(([key]) => key)).toEqual([stepKey]);
	});

	it('runs up to its own concurrency limit of handlers at once on each queue', async () => {
		const { orchestrationConsumer, stepConsumer, orchestrationHandler, stepHandler, stop } =
			startBlocked(create({ orchestration: 2, step: 3 }));
		orchestrationConsumer.items.push(...Array<string>(3).fill(enqueued));
		stepConsumer.items.push(...Array<string>(4).fill(ready));

		try {
			await vi.waitFor(() => {
				expect(orchestrationHandler).toHaveBeenCalledTimes(2);
				expect(stepHandler).toHaveBeenCalledTimes(3);
			});

			expect(orchestrationConsumer.items).toHaveLength(1);
			expect(stepConsumer.items).toHaveLength(1);
		} finally {
			await stop();
		}
	});

	it('drops a message of the other queue and logs it through the given logger', async () => {
		const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
		const { orchestrationConsumer, stepConsumer, orchestrationHandler, stepHandler, stop } =
			startBlocked(create(undefined, logger));
		orchestrationConsumer.items.push(ready);
		stepConsumer.items.push(enqueued);

		try {
			await vi.waitFor(() => expect(logger.error).toHaveBeenCalledTimes(2));
		} finally {
			await stop();
		}

		expect(orchestrationHandler).not.toHaveBeenCalled();
		expect(stepHandler).not.toHaveBeenCalled();
	});

	it('opens no consumer connection for a queue that it only publishes to', async () => {
		const { publisher, consumers, queues, close } = create();

		await queues.orchestration.publish({ type: 'execution:enqueued', executionId: 'exec-1' });
		await queues.step.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' });
		close();

		expect(publisher.lpush).toHaveBeenCalledTimes(2);
		expect(consumers).toHaveLength(0);
	});

	it('opens one consumer connection when a queue starts and keeps it after a restart', async () => {
		const { consumers, queues } = create();

		queues.step.start(async () => {});
		expect(consumers).toHaveLength(1);
		expect(() => queues.step.start(async () => {})).toThrow('work queue already has a consumer');
		await queues.step.stop();
		queues.step.start(async () => {});
		await queues.step.stop();

		expect(consumers).toHaveLength(1);
	});

	it('closes the consumer connections it opened but not the publisher', async () => {
		const { publisher, consumers, queues, close } = create();
		queues.orchestration.start(async () => {});
		await queues.orchestration.stop();

		close();

		expect(consumers).toHaveLength(1);
		expect(consumers[0].disconnect).toHaveBeenCalledOnce();
		expect(publisher.disconnect).not.toHaveBeenCalled();
	});
});

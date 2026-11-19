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
	const [orchestrationConsumer, stepConsumer] = consumers;
	return { publisher, consumers, orchestrationConsumer, stepConsumer, queues, close };
}

/** Starts both queues with handlers that block until `stop()`. */
function startBlocked({ queues }: ReturnType<typeof create>) {
	let release = () => {};
	const blocked = new Promise<void>((resolve) => (release = resolve));
	const orchestrationHandler = vi.fn(async () => await blocked);
	const stepHandler = vi.fn(async () => await blocked);
	queues.orchestration.start(orchestrationHandler);
	queues.step.start(stepHandler);
	const stop = async () => {
		// Stop before the release, so that no queue starts a fetch that waits for the block timeout.
		const stopping = Promise.all([queues.orchestration.stop(), queues.step.stop()]);
		release();
		await stopping;
	};
	return { orchestrationHandler, stepHandler, stop };
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
		const created = create();
		const { orchestrationConsumer, stepConsumer } = created;
		orchestrationConsumer.items.push(enqueued);
		stepConsumer.items.push(ready);
		const { orchestrationHandler, stepHandler, stop } = startBlocked(created);

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
		const created = create({ orchestration: 2, step: 3 });
		const { orchestrationConsumer, stepConsumer } = created;
		orchestrationConsumer.items.push(...Array<string>(3).fill(enqueued));
		stepConsumer.items.push(...Array<string>(4).fill(ready));
		const { orchestrationHandler, stepHandler, stop } = startBlocked(created);

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
		const created = create(undefined, logger);
		created.orchestrationConsumer.items.push(ready);
		created.stepConsumer.items.push(enqueued);
		const { orchestrationHandler, stepHandler, stop } = startBlocked(created);

		try {
			await vi.waitFor(() => expect(logger.error).toHaveBeenCalledTimes(2));
		} finally {
			await stop();
		}

		expect(orchestrationHandler).not.toHaveBeenCalled();
		expect(stepHandler).not.toHaveBeenCalled();
	});

	it('closes the consumer connections it opened but not the publisher', () => {
		const { publisher, consumers, close } = create();

		close();

		expect(consumers).toHaveLength(2);
		for (const { disconnect } of consumers) expect(disconnect).toHaveBeenCalledOnce();
		expect(publisher.disconnect).not.toHaveBeenCalled();
	});
});

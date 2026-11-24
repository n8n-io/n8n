import { describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { createRedisWorkQueues } from '../redis-work-queues';
import { FakeRedisList } from './fake-redis-list';

const orchestrationKey = 'n8n:engine-v2-queue:orchestration';
const stepKey = 'n8n:engine-v2-queue:step';
const enqueued = JSON.stringify({ type: 'execution:enqueued', executionId: 'exec-1' });
const ready = JSON.stringify({ type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' });

function create(concurrency = { orchestration: 1, step: 1 }, logger?: EngineLogger) {
	const publisher = new FakeRedisList();
	const connections: FakeRedisList[] = [];
	const { queues, close } = createRedisWorkQueues({
		publisher,
		createConsumer: () => {
			const connection = new FakeRedisList();
			connections.push(connection);
			return connection;
		},
		keyPrefix: 'n8n',
		concurrency,
		logger,
	});
	return { publisher, connections, queues, close };
}

/** Starts both queues with handlers that block until `stop()`. Fill their lists before the next await. */
function startBlocked({ queues, connections }: ReturnType<typeof create>) {
	let release = () => {};
	const blocked = new Promise<void>((resolve) => (release = resolve));
	const orchestrationHandler = vi.fn(async () => await blocked);
	const stepHandler = vi.fn(async () => await blocked);
	queues.consumers.orchestration.start(orchestrationHandler);
	queues.consumers.step.start(stepHandler);
	const [orchestrationConnection, stepConnection] = connections;
	const stop = async () => {
		// Stop before the release, so that no queue starts a fetch that waits for the block timeout.
		const stopping = Promise.all([
			queues.consumers.orchestration.stop(),
			queues.consumers.step.stop(),
		]);
		release();
		await stopping;
	};
	return { orchestrationConnection, stepConnection, orchestrationHandler, stepHandler, stop };
}

describe('createRedisWorkQueues', () => {
	it('publishes each queue to its own list under the key prefix', async () => {
		const { publisher, queues } = create();

		await queues.publishers.orchestration.publish({
			type: 'execution:enqueued',
			executionId: 'exec-1',
		});
		await queues.publishers.step.publish({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-1',
		});

		expect(publisher.lpush.mock.calls).toEqual([
			[orchestrationKey, enqueued],
			[stepKey, ready],
		]);
	});

	it('consumes each queue from its own list over its own connection', async () => {
		const { orchestrationConnection, stepConnection, orchestrationHandler, stepHandler, stop } =
			startBlocked(create());
		orchestrationConnection.items.push(enqueued);
		stepConnection.items.push(ready);

		try {
			await vi.waitFor(() => {
				expect(orchestrationHandler).toHaveBeenCalledWith(JSON.parse(enqueued));
				expect(stepHandler).toHaveBeenCalledWith(JSON.parse(ready));
			});
		} finally {
			await stop();
		}

		expect(orchestrationConnection.brpop.mock.calls.map(([key]) => key)).toEqual([
			orchestrationKey,
		]);
		expect(stepConnection.brpop.mock.calls.map(([key]) => key)).toEqual([stepKey]);
	});

	it('runs up to its own concurrency limit of handlers at once on each queue', async () => {
		const { orchestrationConnection, stepConnection, orchestrationHandler, stepHandler, stop } =
			startBlocked(create({ orchestration: 2, step: 3 }));
		orchestrationConnection.items.push(...Array<string>(3).fill(enqueued));
		stepConnection.items.push(...Array<string>(4).fill(ready));

		try {
			await vi.waitFor(() => {
				expect(orchestrationHandler).toHaveBeenCalledTimes(2);
				expect(stepHandler).toHaveBeenCalledTimes(3);
			});

			expect(orchestrationConnection.items).toHaveLength(1);
			expect(stepConnection.items).toHaveLength(1);
		} finally {
			await stop();
		}
	});

	it('drops a message of the other queue and logs it through the given logger', async () => {
		const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
		const { orchestrationConnection, stepConnection, orchestrationHandler, stepHandler, stop } =
			startBlocked(create(undefined, logger));
		orchestrationConnection.items.push(ready);
		stepConnection.items.push(enqueued);

		try {
			await vi.waitFor(() => expect(logger.error).toHaveBeenCalledTimes(2));
		} finally {
			await stop();
		}

		expect(orchestrationHandler).not.toHaveBeenCalled();
		expect(stepHandler).not.toHaveBeenCalled();
	});

	it('opens no consumer connection for a queue that it only publishes to', async () => {
		const { publisher, connections, queues, close } = create();

		await queues.publishers.orchestration.publish({
			type: 'execution:enqueued',
			executionId: 'exec-1',
		});
		await queues.publishers.step.publish({
			type: 'step:ready',
			executionId: 'exec-1',
			stepId: 'step-1',
		});
		close();

		expect(publisher.lpush).toHaveBeenCalledTimes(2);
		expect(connections).toHaveLength(0);
	});

	it('opens one consumer connection when a queue starts and keeps it after a restart', async () => {
		const { connections, queues } = create();

		queues.consumers.step.start(async () => {});
		expect(connections).toHaveLength(1);
		expect(() => queues.consumers.step.start(async () => {})).toThrow(
			'work queue already has a consumer',
		);
		await queues.consumers.step.stop();
		queues.consumers.step.start(async () => {});
		await queues.consumers.step.stop();

		expect(connections).toHaveLength(1);
	});

	it('closes the consumer connections it opened but not the publisher', async () => {
		const { publisher, connections, queues, close } = create();
		queues.consumers.orchestration.start(async () => {});
		await queues.consumers.orchestration.stop();

		close();

		expect(connections).toHaveLength(1);
		expect(connections[0].disconnect).toHaveBeenCalledOnce();
		expect(publisher.disconnect).not.toHaveBeenCalled();
	});
});

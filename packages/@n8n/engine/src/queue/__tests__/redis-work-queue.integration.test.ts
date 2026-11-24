import { randomUUID } from 'node:crypto';

import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { RedisWorkQueueConsumer, RedisWorkQueuePublisher } from '../redis-work-queue';
import {
	describeWorkQueueContract,
	parseContractMessage,
	type ContractMessage,
} from './work-queue.contract';

const silentLogger: EngineLogger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
};

let container: StartedRedisContainer;

beforeAll(async () => {
	container = await new RedisContainer(TEST_CONTAINER_IMAGES.redis).start();
}, 120_000);

afterAll(async () => {
	if (container) await container.stop();
});

/**
 * One engine process: its own publishing connection, its own blocking
 * consumer connection, and a publisher and a consumer on the given key.
 */
function createEngineProcess(key: string, concurrency = 1, blockTimeoutSeconds = 0.05) {
	const publisherConnection = new Redis(container.getConnectionUrl());
	const consumerConnection = new Redis(container.getConnectionUrl());
	const publisher = new RedisWorkQueuePublisher<ContractMessage>(publisherConnection, key);
	const consumer = new RedisWorkQueueConsumer<ContractMessage>({
		openConnection: () => consumerConnection,
		publisher: publisherConnection,
		key,
		parse: parseContractMessage,
		logger: silentLogger,
		concurrency,
		blockTimeoutSeconds,
	});
	const dispose = async () => {
		await Promise.all([publisherConnection.quit(), consumerConnection.quit()]);
	};
	return { publisher, consumer, publisherConnection, consumerConnection, dispose };
}

const newKey = () => `engine:test:${randomUUID()}`;

describeWorkQueueContract('Redis work queue', ({ concurrency }) =>
	createEngineProcess(newKey(), concurrency),
);

describe('Redis work queue (integration)', () => {
	const processes: Array<ReturnType<typeof createEngineProcess>> = [];

	function startProcess(key: string, concurrency = 1, blockTimeoutSeconds?: number) {
		const engine = createEngineProcess(key, concurrency, blockTimeoutSeconds);
		processes.push(engine);
		return engine;
	}

	afterEach(async () => {
		for (const { consumer, dispose } of processes.splice(0)) {
			await consumer.stop();
			await dispose();
		}
	});

	it('delivers each message exactly once between two queues that consume one key', async () => {
		const key = newKey();
		const first = startProcess(key, 2);
		const second = startProcess(key, 2);
		const received: number[] = [];
		const handler = async ({ n }: ContractMessage) => {
			received.push(n);
		};
		first.consumer.start(handler);
		second.consumer.start(handler);

		const expected = Array.from({ length: 50 }, (_, index) => index + 1);
		for (const n of expected) await first.publisher.publish({ n });

		await vi.waitFor(() => expect([...received].sort((x, y) => x - y)).toEqual(expected), {
			timeout: 5_000,
		});
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(received).toHaveLength(expected.length);
	});

	it('leaves messages that a stopped queue did not start in the list for the next consumer on the same key', async () => {
		const key = newKey();
		const first = startProcess(key, 1);
		const firstReceived: number[] = [];
		let releaseFirst!: () => void;
		const firstGate = new Promise<void>((resolve) => (releaseFirst = resolve));
		first.consumer.start(async ({ n }) => {
			firstReceived.push(n);
			await firstGate;
		});
		try {
			for (const n of [1, 2, 3]) await first.publisher.publish({ n });
			await vi.waitFor(() => expect(firstReceived).toHaveLength(1));

			const stopping = first.consumer.stop();
			releaseFirst();
			await stopping;
		} finally {
			releaseFirst();
		}

		const next = startProcess(key, 1);
		const nextReceived: number[] = [];
		next.consumer.start(async ({ n }) => {
			nextReceived.push(n);
		});

		await vi.waitFor(() =>
			expect([...firstReceived, ...nextReceived].sort((x, y) => x - y)).toEqual([1, 2, 3]),
		);
		expect(firstReceived).toEqual([1]);
		expect(await next.publisherConnection.llen(key)).toBe(0);
	});

	it('gives a message that a pending fetch returns after stop back to the list and does not run it', async () => {
		const key = newKey();
		const engine = startProcess(key, 1, 2);
		const consumerId = await engine.consumerConnection.client('ID');
		const giveBack = vi.spyOn(engine.publisherConnection, 'rpush');
		const handler = vi.fn(async () => {});
		engine.consumer.start(handler);
		await vi.waitFor(async () =>
			expect(await engine.publisherConnection.client('LIST', 'ID', consumerId)).toContain(
				'cmd=brpop',
			),
		);

		const stopping = engine.consumer.stop();
		await engine.publisher.publish({ n: 1 });
		await stopping;

		expect(handler).not.toHaveBeenCalled();
		expect(giveBack).toHaveBeenCalledWith(key, '{"n":1}');
		expect(await engine.publisherConnection.lrange(key, 0, -1)).toEqual(['{"n":1}']);
	});
});

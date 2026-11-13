import { randomUUID } from 'node:crypto';

import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { EngineLogger } from '../../logging';
import { RedisWorkQueue } from '../redis-work-queue';
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
 * consumer connection, and a queue on the given key.
 */
function createEngineProcess(key: string, concurrency = 1, blockTimeoutSeconds = 0.05) {
	const publisher = new Redis(container.getConnectionUrl());
	const consumer = new Redis(container.getConnectionUrl());
	const queue = new RedisWorkQueue<ContractMessage>({
		publisher,
		consumer,
		key,
		parse: parseContractMessage,
		logger: silentLogger,
		concurrency,
		blockTimeoutSeconds,
	});
	const dispose = async () => {
		await Promise.all([publisher.quit(), consumer.quit()]);
	};
	return { queue, publisher, dispose };
}

const newKey = () => `engine:test:${randomUUID()}`;

describeWorkQueueContract('RedisWorkQueue', ({ concurrency }) =>
	createEngineProcess(newKey(), concurrency),
);

describe('RedisWorkQueue (integration)', () => {
	const processes: Array<ReturnType<typeof createEngineProcess>> = [];

	function startProcess(key: string, concurrency = 1, blockTimeoutSeconds?: number) {
		const engine = createEngineProcess(key, concurrency, blockTimeoutSeconds);
		processes.push(engine);
		return engine;
	}

	afterEach(async () => {
		for (const { queue, dispose } of processes.splice(0)) {
			await queue.stop();
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
		first.queue.start(handler);
		second.queue.start(handler);

		const expected = Array.from({ length: 50 }, (_, index) => index + 1);
		for (const n of expected) await first.queue.publish({ n });

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
		first.queue.start(async ({ n }) => {
			firstReceived.push(n);
			await new Promise<void>((resolve) => (releaseFirst = resolve));
		});
		for (const n of [1, 2, 3]) await first.queue.publish({ n });
		await vi.waitFor(() => expect(firstReceived).toHaveLength(1));

		const stopping = first.queue.stop();
		releaseFirst();
		await stopping;

		const next = startProcess(key, 1);
		const nextReceived: number[] = [];
		next.queue.start(async ({ n }) => {
			nextReceived.push(n);
		});

		await vi.waitFor(() =>
			expect([...firstReceived, ...nextReceived].sort((x, y) => x - y)).toEqual([1, 2, 3]),
		);
		expect(firstReceived).toEqual([1]);
		expect(await next.publisher.llen(key)).toBe(0);
	});

	it('gives a message that a pending fetch returns after stop back to the list and does not run it', async () => {
		const key = newKey();
		const engine = startProcess(key, 1, 2);
		const handler = vi.fn(async () => {});
		engine.queue.start(handler);

		const stopping = engine.queue.stop();
		await engine.queue.publish({ n: 1 });
		await stopping;

		expect(handler).not.toHaveBeenCalled();
		expect(await engine.publisher.lrange(key, 0, -1)).toEqual(['{"n":1}']);
	});
});

import type { Cluster, Redis } from 'ioredis';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { UnexpectedError } from '../../common';
import type { EngineLogger } from '../../logging';
import {
	RedisWorkQueue,
	type RedisWorkQueueOptions,
	type WorkQueueConsumerClient,
	type WorkQueuePublisherClient,
} from '../redis-work-queue';
import { FakeRedisList } from './fake-redis-list';
import { parseContractMessage, type ContractMessage } from './work-queue.contract';

const KEY = 'engine:test-queue';

const silentLogger: EngineLogger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
};

const queues: Array<RedisWorkQueue<ContractMessage>> = [];

function createQueue(
	redis: FakeRedisList,
	options: Partial<RedisWorkQueueOptions<ContractMessage>> = {},
) {
	const queue = new RedisWorkQueue<ContractMessage>({
		publisher: redis,
		openConsumer: () => redis,
		key: KEY,
		parse: parseContractMessage,
		logger: silentLogger,
		blockTimeoutSeconds: 0.05,
		...options,
	});
	queues.push(queue);
	return queue;
}

describe('RedisWorkQueue', () => {
	afterEach(async () => {
		vi.useRealTimers();
		for (const queue of queues.splice(0)) await queue.stop();
	});

	it('logs a failed push-back and still resolves stop', async () => {
		const logger = { ...silentLogger, error: vi.fn() };
		const redis = new FakeRedisList();
		let answerFetch!: (popped: [string, string]) => void;
		redis.brpop.mockImplementationOnce(
			async () => await new Promise((resolve) => (answerFetch = resolve)),
		);
		const error = new Error('connection lost');
		redis.rpush.mockRejectedValueOnce(error);
		const queue = createQueue(redis, { logger });
		queue.start(async () => {});
		await vi.waitFor(() => expect(redis.brpop).toHaveBeenCalledTimes(1));

		const stopping = queue.stop();
		answerFetch([KEY, '{"n":1}']);
		await stopping;

		expect(logger.error).toHaveBeenCalledWith(
			`work queue ${KEY} could not return a message: connection lost`,
			{
				error,
				value: '{"n":1}',
			},
		);
	});

	it.each([
		['is not JSON', 'not json'],
		['the parser refuses', '{"n":"one"}'],
	])('logs and drops a message that %s, then delivers the next one', async (_case, malformed) => {
		const logger = { ...silentLogger, error: vi.fn() };
		const redis = new FakeRedisList();
		await redis.lpush(KEY, malformed);
		await redis.lpush(KEY, '{"n":2}');
		const received: ContractMessage[] = [];
		const queue = createQueue(redis, { logger });

		queue.start(async (message) => {
			received.push(message);
		});

		await vi.waitFor(() => expect(received).toEqual([{ n: 2 }]));
		expect(logger.error).toHaveBeenCalledWith(
			expect.stringMatching(new RegExp(`^work queue ${KEY} dropped a malformed message: .+`)),
			{ error: expect.any(Error), value: malformed },
		);
	});

	it('logs a failed fetch and fetches again after a one second delay', async () => {
		vi.useFakeTimers();
		const logger = { ...silentLogger, error: vi.fn() };
		const redis = new FakeRedisList();
		const error = new Error('connection lost');
		redis.brpop.mockRejectedValueOnce(error);
		await redis.lpush(KEY, '{"n":1}');
		const handler = vi.fn(async () => {});
		const queue = createQueue(redis, { logger });

		queue.start(handler);
		await vi.advanceTimersByTimeAsync(0);

		expect(logger.error).toHaveBeenCalledWith(`work queue ${KEY} fetch failed: connection lost`, {
			error,
		});
		await vi.advanceTimersByTimeAsync(999);
		expect(redis.brpop).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1);
		expect(handler).toHaveBeenCalledWith({ n: 1 });

		const stopping = queue.stop();
		await vi.advanceTimersByTimeAsync(100);
		await stopping;
	});

	it('cancels the retry delay when stop is called', async () => {
		const redis = new FakeRedisList();
		redis.brpop.mockRejectedValueOnce(new Error('connection lost'));
		const queue = createQueue(redis);
		queue.start(async () => {});
		await vi.waitFor(() => expect(redis.brpop).toHaveBeenCalledTimes(1));

		const startedAt = Date.now();
		await queue.stop();

		expect(Date.now() - startedAt).toBeLessThan(500);
		expect(redis.brpop).toHaveBeenCalledTimes(1);
	});

	it('does not wait for the retry delay when the pending fetch fails after stop is called', async () => {
		vi.useFakeTimers();
		const redis = new FakeRedisList();
		let failFetch!: (error: Error) => void;
		redis.brpop.mockImplementationOnce(
			async () => await new Promise((_resolve, reject) => (failFetch = reject)),
		);
		const queue = createQueue(redis);
		queue.start(async () => {});
		await vi.advanceTimersByTimeAsync(0);
		let stopped = false;

		const stopping = queue.stop().then(() => {
			stopped = true;
		});
		failFetch(new Error('connection lost'));
		await vi.advanceTimersByTimeAsync(0);

		expect(stopped).toBe(true);
		await stopping;
	});

	it('resolves stop one second after the block timeout when a fetch never returns', async () => {
		vi.useFakeTimers();
		const redis = new FakeRedisList();
		redis.brpop.mockImplementation(async () => await new Promise(() => {}));
		const queue = createQueue(redis, { blockTimeoutSeconds: 2 });
		queue.start(async () => {});
		await vi.advanceTimersByTimeAsync(0);
		let stopped = false;

		const stopping = queue.stop().then(() => {
			stopped = true;
		});
		await vi.advanceTimersByTimeAsync(2_999);
		expect(stopped).toBe(false);

		await vi.advanceTimersByTimeAsync(1);
		await stopping;
		expect(stopped).toBe(true);
	});

	it('gives a message that a fetch returns after stop gave up back to the list, so a consumer started later receives it', async () => {
		vi.useFakeTimers();
		const redis = new FakeRedisList();
		let answerFetch!: (popped: [string, string]) => void;
		redis.brpop.mockImplementationOnce(
			async () => await new Promise((resolve) => (answerFetch = resolve)),
		);
		const firstHandler = vi.fn(async (_message: ContractMessage) => {});
		const secondHandler = vi.fn(async (_message: ContractMessage) => {});
		const queue = createQueue(redis);
		queue.start(firstHandler);
		await vi.advanceTimersByTimeAsync(0);
		const stopping = queue.stop();
		await vi.advanceTimersByTimeAsync(1_050);
		await stopping;

		queue.start(secondHandler);
		await vi.advanceTimersByTimeAsync(0);
		answerFetch([KEY, '{"n":1}']);
		await vi.advanceTimersByTimeAsync(0);

		expect(firstHandler).not.toHaveBeenCalled();
		expect(redis.rpush).toHaveBeenCalledWith(KEY, '{"n":1}');
		expect(secondHandler).toHaveBeenCalledWith({ n: 1 });

		const stoppingAgain = queue.stop();
		await vi.advanceTimersByTimeAsync(100);
		await stoppingAgain;
	});

	it('starts a new fetch loop only after the loop that stop gave up on has ended', async () => {
		vi.useFakeTimers();
		const redis = new FakeRedisList();
		let answerFetch!: (popped: null) => void;
		redis.brpop.mockImplementationOnce(
			async () => await new Promise((resolve) => (answerFetch = resolve)),
		);
		const queue = createQueue(redis);
		queue.start(async () => {});
		await vi.advanceTimersByTimeAsync(0);
		const stopping = queue.stop();
		await vi.advanceTimersByTimeAsync(1_050);
		await stopping;

		queue.start(async () => {});
		await vi.advanceTimersByTimeAsync(1_000);
		expect(redis.brpop).toHaveBeenCalledTimes(1);

		answerFetch(null);
		await vi.advanceTimersByTimeAsync(0);
		expect(redis.brpop).toHaveBeenCalledTimes(2);

		const stoppingAgain = queue.stop();
		await vi.advanceTimersByTimeAsync(100);
		await stoppingAgain;
	});

	it('does not fetch while every handler slot is busy', async () => {
		const redis = new FakeRedisList();
		for (const n of [1, 2, 3]) await redis.lpush(KEY, JSON.stringify({ n }));
		const releases: Array<() => void> = [];
		const queue = createQueue(redis, { concurrency: 2 });

		queue.start(async () => await new Promise<void>((resolve) => releases.push(resolve)));
		try {
			await vi.waitFor(() => expect(releases).toHaveLength(2));
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(redis.brpop).toHaveBeenCalledTimes(2);
			expect(redis.items).toHaveLength(1);

			releases[0]();
			await vi.waitFor(() => expect(releases).toHaveLength(3));
		} finally {
			const stopping = queue.stop();
			for (const release of releases) release();
			await stopping;
		}
	});

	it('logs a handler that throws synchronously and keeps delivering', async () => {
		const logger = { ...silentLogger, error: vi.fn() };
		const redis = new FakeRedisList();
		await redis.lpush(KEY, '{"n":1}');
		await redis.lpush(KEY, '{"n":2}');
		const error = new Error('handler failed');
		const handler = vi.fn(async (_message: ContractMessage) => {});
		handler.mockImplementationOnce(() => {
			throw error;
		});
		const queue = createQueue(redis, { logger });

		queue.start(handler);

		await vi.waitFor(() => expect(handler.mock.calls).toEqual([[{ n: 1 }], [{ n: 2 }]]));
		expect(logger.error).toHaveBeenCalledWith(`work queue ${KEY} handler failed: handler failed`, {
			error,
		});
	});

	it('refuses a second consumer while one is registered', () => {
		const queue = createQueue(new FakeRedisList());
		queue.start(async () => {});

		expect(() => queue.start(async () => {})).toThrow(UnexpectedError);
	});

	it('accepts ioredis Redis and Cluster clients', () => {
		expectTypeOf<Redis>().toExtend<WorkQueuePublisherClient & WorkQueueConsumerClient>();
		expectTypeOf<Cluster>().toExtend<WorkQueuePublisherClient & WorkQueueConsumerClient>();
	});

	it.each([
		['concurrency', 0],
		['concurrency', -1],
		['concurrency', 1.5],
		['concurrency', Number.NaN],
		['blockTimeoutSeconds', 0],
		['blockTimeoutSeconds', -1],
		['blockTimeoutSeconds', Number.POSITIVE_INFINITY],
		['blockTimeoutSeconds', Number.NaN],
		['blockTimeoutSeconds', 2_147_483],
	])('refuses a %s of %s', (option, value) => {
		expect(() => createQueue(new FakeRedisList(), { [option]: value })).toThrow(UnexpectedError);
	});

	it('accepts a blockTimeoutSeconds for which the stop wait still fits in a Node timer', () => {
		expect(() =>
			createQueue(new FakeRedisList(), { blockTimeoutSeconds: 2_147_482 }),
		).not.toThrow();
	});
});

import { describe, expect, it, vi } from 'vitest';

import { UnexpectedError } from '../../common';
import type { EngineLogger } from '../../logging';
import { createInMemoryWorkQueueFactory, InMemoryWorkQueue } from '../in-memory-work-queue';
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

describeWorkQueueContract('InMemoryWorkQueue', ({ concurrency }) => {
	const factory = createInMemoryWorkQueueFactory();
	return {
		publisher: factory.createPublisher<ContractMessage>('test'),
		consumer: factory.createConsumer('test', {
			concurrency,
			parse: parseContractMessage,
			logger: silentLogger,
		}),
	};
});

describe('createInMemoryWorkQueueFactory', () => {
	it('delivers only to the consumer of the same name in the same factory', async () => {
		const factory = createInMemoryWorkQueueFactory();
		const consumerOptions = { concurrency: 1, parse: parseContractMessage, logger: silentLogger };
		const received: Record<string, number[]> = { first: [], second: [], otherFactory: [] };
		const recordAs =
			(consumer: string) =>
			async ({ n }: ContractMessage) => {
				received[consumer].push(n);
			};
		const publisher = factory.createPublisher<ContractMessage>('first');
		factory.createConsumer('first', consumerOptions).start(recordAs('first'));
		factory.createConsumer('second', consumerOptions).start(recordAs('second'));
		createInMemoryWorkQueueFactory()
			.createConsumer('first', consumerOptions)
			.start(recordAs('otherFactory'));

		await publisher.publish({ n: 1 });

		await expect.poll(() => received.first).toEqual([1]);
		expect(received).toEqual({ first: [1], second: [], otherFactory: [] });
	});

	it('logs a message that fails the check of the consumer, and does not hand it over', async () => {
		const factory = createInMemoryWorkQueueFactory();
		const logger = { ...silentLogger, error: vi.fn() };
		const handler = vi.fn(async () => {});
		const consumer = factory.createConsumer('test', {
			concurrency: 1,
			parse: parseContractMessage,
			logger,
		});
		consumer.start(handler);

		await factory.createPublisher<unknown>('test').publish({ n: 'not a number' });
		await consumer.stop();

		expect(handler).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledOnce();
	});
});

describe('InMemoryWorkQueue', () => {
	it('runs one handler at a time when no concurrency is given', async () => {
		const queue = new InMemoryWorkQueue<ContractMessage>(silentLogger);
		let inFlight = 0;
		let maxInFlight = 0;
		let done = 0;
		queue.start(async () => {
			inFlight += 1;
			maxInFlight = Math.max(maxInFlight, inFlight);
			await new Promise((resolve) => setTimeout(resolve, 1));
			inFlight -= 1;
			done += 1;
		});

		for (let n = 1; n <= 5; n++) await queue.publish({ n });
		await expect.poll(() => done).toBe(5);

		expect(maxInFlight).toBe(1);
	});

	it('starts messages in the order they were published', async () => {
		const queue = new InMemoryWorkQueue<ContractMessage>(silentLogger, { concurrency: 3 });
		const started: number[] = [];
		queue.start(async ({ n }) => {
			started.push(n);
			await new Promise((resolve) => setTimeout(resolve, 1));
		});

		for (let n = 1; n <= 9; n++) await queue.publish({ n });
		await expect.poll(() => started.length).toBe(9);

		expect(started).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('logs a handler error and still runs the next message', async () => {
		const logger = { ...silentLogger, error: vi.fn() };
		const queue = new InMemoryWorkQueue<ContractMessage>(logger);
		const error = new Error('handler failed');
		const received: number[] = [];
		queue.start(async ({ n }) => {
			received.push(n);
			if (n === 1) throw error;
		});

		await queue.publish({ n: 1 });
		await queue.publish({ n: 2 });
		await expect.poll(() => received).toEqual([1, 2]);

		expect(logger.error).toHaveBeenCalledWith('work queue handler failed', { error });
	});

	it('keeps delivering when a handler throws synchronously for many queued messages', async () => {
		const queue = new InMemoryWorkQueue<ContractMessage>(silentLogger);
		const count = 5_000;
		for (let n = 1; n <= count; n++) await queue.publish({ n });

		let attempted = 0;
		const throwingHandler = () => {
			attempted += 1;
			throw new Error('handler failed');
		};
		queue.start(throwingHandler);

		await expect.poll(() => attempted, { timeout: 2_000 }).toBe(count);
	});

	it.each([0, -1, 1.5, Number.NaN])('refuses a concurrency of %s', (concurrency) => {
		expect(() => new InMemoryWorkQueue<ContractMessage>(silentLogger, { concurrency })).toThrow(
			UnexpectedError,
		);
	});
});

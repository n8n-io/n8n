import { UnexpectedError } from '../common';
import { createConsoleLogger, type EngineLogger } from '../logging';
import { checkWorkQueueConcurrency } from './work-queue-concurrency';
import type { WorkQueue } from './work-queue.types';

/**
 * The commands that write to a work queue list. ioredis `Redis` and `Cluster`
 * have them. One connection can serve all queues.
 */
export interface WorkQueuePublisherClient {
	lpush(key: string, value: string): Promise<number>;
	rpush(key: string, value: string): Promise<number>;
}

/**
 * The command that reads from a work queue list. ioredis `Redis` and `Cluster`
 * have it. A blocking pop holds its connection, so give each queue its own.
 */
export interface WorkQueueConsumerClient {
	brpop(key: string, timeoutSeconds: number): Promise<[string, string] | null>;
}

export interface RedisWorkQueueOptions<TMessage> {
	publisher: WorkQueuePublisherClient;
	consumer: WorkQueueConsumerClient;
	/** The Redis list that holds the messages of this queue. */
	key: string;
	/** Checks a message after JSON decoding. A throw drops the message. */
	parse: (value: unknown) => TMessage;
	logger?: EngineLogger;
	/** The maximum number of handlers that run at once. Default: 1. */
	concurrency?: number;
	/** How long one fetch waits for a message. Default: 1. Fractions need Redis 6 or later. */
	blockTimeoutSeconds?: number;
}

const RETRY_DELAY_MS = 1_000;

/** How much longer than one fetch `stop()` waits for that fetch to return. */
const STOP_MARGIN_MS = 1_000;

/** Resolves after `ms`, or immediately when `signal` aborts. */
async function delay(ms: number, signal: AbortSignal): Promise<void> {
	if (signal.aborted) return;
	await new Promise<void>((resolve) => {
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener('abort', done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener('abort', done);
	});
}

/**
 * `WorkQueue` on a Redis list. `publish` adds to the head of the list (LPUSH).
 * One fetch loop takes from the tail (BRPOP), and only when a handler slot is
 * free. The caller owns the clients: this class never closes them.
 */
export class RedisWorkQueue<TMessage> implements WorkQueue<TMessage> {
	private readonly publisher: WorkQueuePublisherClient;

	private readonly consumer: WorkQueueConsumerClient;

	private readonly key: string;

	private readonly parse: (value: unknown) => TMessage;

	private readonly logger: EngineLogger;

	private readonly concurrency: number;

	private readonly blockTimeoutSeconds: number;

	private active: { stopping: AbortController; loop: Promise<void> } | undefined;

	private readonly inFlight = new Set<Promise<void>>();

	constructor(options: RedisWorkQueueOptions<TMessage>) {
		const { blockTimeoutSeconds = 1 } = options;
		// Zero makes BRPOP wait forever, so `stop()` could not end the fetch loop.
		if (!Number.isFinite(blockTimeoutSeconds) || blockTimeoutSeconds <= 0) {
			throw new UnexpectedError(
				`work queue block timeout is ${blockTimeoutSeconds}; it must be a positive number of seconds`,
			);
		}
		this.publisher = options.publisher;
		this.consumer = options.consumer;
		this.key = options.key;
		this.parse = options.parse;
		this.logger = options.logger ?? createConsoleLogger();
		this.concurrency = checkWorkQueueConcurrency(options.concurrency ?? 1);
		this.blockTimeoutSeconds = blockTimeoutSeconds;
	}

	async publish(message: TMessage): Promise<void> {
		await this.publisher.lpush(this.key, JSON.stringify(message));
	}

	start(handler: (message: TMessage) => Promise<void>): void {
		if (this.active) {
			throw new UnexpectedError('work queue already has a consumer');
		}
		const stopping = new AbortController();
		this.active = { stopping, loop: this.consume(handler, stopping.signal) };
	}

	async stop(): Promise<void> {
		const handlersDone = Promise.all(this.inFlight);
		const active = this.active;
		this.active = undefined;
		if (active) {
			active.stopping.abort();
			// A fetch returns within the block timeout. If Redis is unreachable it
			// may not, so wait for it only for a limited time.
			const timeout = new AbortController();
			await Promise.race([
				active.loop,
				delay(this.blockTimeoutSeconds * 1000 + STOP_MARGIN_MS, timeout.signal),
			]);
			timeout.abort();
		}
		await handlersDone;
	}

	private async consume(
		handler: (message: TMessage) => Promise<void>,
		signal: AbortSignal,
	): Promise<void> {
		while (!signal.aborted) {
			while (this.inFlight.size >= this.concurrency) await Promise.race(this.inFlight);
			if (signal.aborted) return;

			const value = await this.fetch(signal);
			if (value === undefined) continue;
			if (signal.aborted) {
				await this.giveBack(value);
				return;
			}

			const decoded = this.decode(value);
			if (decoded) this.dispatch(handler, decoded.message);
		}
	}

	/** Returns the next value in the list, or `undefined` if none came. */
	private async fetch(signal: AbortSignal): Promise<string | undefined> {
		try {
			const popped = await this.consumer.brpop(this.key, this.blockTimeoutSeconds);
			return popped?.[1];
		} catch (error) {
			this.logger.error('work queue fetch failed', { error });
			await delay(RETRY_DELAY_MS, signal);
			return undefined;
		}
	}

	/** Puts a value back at the end that consumers read, so the next consumer takes it first. */
	private async giveBack(value: string): Promise<void> {
		try {
			await this.publisher.rpush(this.key, value);
		} catch (error) {
			this.logger.error('work queue could not return a message', { error, value });
		}
	}

	private decode(value: string): { message: TMessage } | undefined {
		try {
			return { message: this.parse(JSON.parse(value)) };
		} catch (error) {
			this.logger.error('work queue dropped a malformed message', { error, value });
			return undefined;
		}
	}

	private dispatch(handler: (message: TMessage) => Promise<void>, message: TMessage): void {
		// `then` makes a synchronous throw a rejection, so the catch below gets it.
		const running: Promise<void> = Promise.resolve()
			.then(async () => await handler(message))
			.catch((error: unknown) => {
				// Contained per message: a failed one must not stop the fetch loop.
				this.logger.error('work queue handler failed', { error });
			})
			.finally(() => this.inFlight.delete(running));
		this.inFlight.add(running);
	}
}

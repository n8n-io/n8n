import type { EngineLogger } from '../logging';
import {
	RedisWorkQueue,
	type WorkQueueConsumerClient,
	type WorkQueuePublisherClient,
} from './redis-work-queue';
import { orchestrationMessageSchema, stepMessageSchema } from './work-queue.schemas';
import type { EngineWorkQueues } from './work-queue.types';

/** A consumer connection that the engine opens through the host, and closes. */
export interface ClosableWorkQueueConsumerClient extends WorkQueueConsumerClient {
	disconnect(): void;
}

export interface RedisWorkQueuesOptions {
	/** Both queues share it. The caller owns it and closes it. */
	publisher: WorkQueuePublisherClient;
	/** Opens a new connection. It is called once for each queue that starts, because a blocking pop holds its connection. */
	createConsumer: () => ClosableWorkQueueConsumerClient;
	/** The Redis key prefix of the host. The engine adds the names of its lists. */
	keyPrefix: string;
	/** The maximum number of handlers that each queue runs at once. */
	concurrency: { orchestration: number; step: number };
	/** Defaults to the console. */
	logger?: EngineLogger;
}

export interface RedisWorkQueues {
	/** Pass them to `createEngineRuntime`, which starts and stops them. */
	queues: EngineWorkQueues;
	/** Closes the consumer connections that the started queues opened. Call it after the engine has stopped the queues. */
	close(): void;
}

/**
 * Creates the engine work queues on Redis lists. Every engine process that
 * uses the same Redis and key prefix shares the same lists.
 */
export function createRedisWorkQueues({
	publisher,
	createConsumer,
	keyPrefix,
	concurrency,
	logger,
}: RedisWorkQueuesOptions): RedisWorkQueues {
	const opened: ClosableWorkQueueConsumerClient[] = [];
	const openConsumer = () => {
		const consumer = createConsumer();
		opened.push(consumer);
		return consumer;
	};

	return {
		queues: {
			orchestration: new RedisWorkQueue({
				publisher,
				openConsumer,
				key: `${keyPrefix}:engine-v2-queue:orchestration`,
				parse: (value) => orchestrationMessageSchema.parse(value),
				logger,
				concurrency: concurrency.orchestration,
			}),
			step: new RedisWorkQueue({
				publisher,
				openConsumer,
				key: `${keyPrefix}:engine-v2-queue:step`,
				parse: (value) => stepMessageSchema.parse(value),
				logger,
				concurrency: concurrency.step,
			}),
		},
		close: () => {
			for (const consumer of opened) consumer.disconnect();
		},
	};
}

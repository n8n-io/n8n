import type { EngineLogger } from '../logging';
import {
	RedisWorkQueueConsumer,
	RedisWorkQueuePublisher,
	type ClosableWorkQueueConsumerClient,
	type WorkQueuePublisherClient,
} from './redis-work-queue';
import { orchestrationMessageSchema, stepMessageSchema } from './work-queue.schemas';
import type { EngineWorkQueues, OrchestrationMessage, StepMessage } from './work-queue.types';

export interface RedisWorkQueuesOptions {
	/** Both queues publish over it. The caller owns it and closes it. */
	publisher: WorkQueuePublisherClient;
	/** Opens a new connection. It is called once for each consumer that starts, because a blocking pop holds its connection. */
	createConsumer: () => ClosableWorkQueueConsumerClient;
	/** The Redis key prefix of the host. The engine adds the names of its lists. */
	keyPrefix: string;
	/** The maximum number of handlers that each queue runs at once. */
	concurrency: { orchestration: number; step: number };
	/** Defaults to the console. */
	logger?: EngineLogger;
}

export interface RedisWorkQueues {
	/** Pass them to `createEngineRuntime`, which starts and stops the consumers. */
	queues: EngineWorkQueues;
	/** Closes the connections that the started consumers opened. Call it after the engine has stopped the consumers. */
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
	const orchestrationKey = `${keyPrefix}:engine-v2-queue:orchestration`;
	const stepKey = `${keyPrefix}:engine-v2-queue:step`;
	const consumers = {
		orchestration: new RedisWorkQueueConsumer({
			openConnection: createConsumer,
			publisher,
			key: orchestrationKey,
			parse: (value) => orchestrationMessageSchema.parse(value),
			logger,
			concurrency: concurrency.orchestration,
		}),
		step: new RedisWorkQueueConsumer({
			openConnection: createConsumer,
			publisher,
			key: stepKey,
			parse: (value) => stepMessageSchema.parse(value),
			logger,
			concurrency: concurrency.step,
		}),
	};

	return {
		queues: {
			publishers: {
				orchestration: new RedisWorkQueuePublisher<OrchestrationMessage>(
					publisher,
					orchestrationKey,
				),
				step: new RedisWorkQueuePublisher<StepMessage>(publisher, stepKey),
			},
			consumers,
		},
		close: () => {
			consumers.orchestration.close();
			consumers.step.close();
		},
	};
}

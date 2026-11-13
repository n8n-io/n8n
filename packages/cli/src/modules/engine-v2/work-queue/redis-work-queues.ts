import type { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { EngineWorkQueues, WorkQueuePublisherClient } from '@n8n/engine';
import { orchestrationMessageSchema, RedisWorkQueue, stepMessageSchema } from '@n8n/engine';

export interface RedisWorkQueues {
	queues: EngineWorkQueues;
	/** Closes the consuming connections of the queues. Call it after the engine has stopped them. */
	close(): void;
}

/**
 * Creates the engine work queues on Redis lists. Every engine process that
 * uses the same Redis and prefix shares the same lists. The caller owns
 * `publisher` and closes it.
 */
export async function createRedisWorkQueues(
	publisher: WorkQueuePublisherClient,
	logger: Logger,
): Promise<RedisWorkQueues> {
	const { RedisClientService } = await import('@n8n/backend-services');
	const redisClientService = Container.get(RedisClientService);
	const prefix = redisClientService.toValidPrefix(Container.get(GlobalConfig).redis.prefix);

	const orchestrationConsumer = redisClientService.createClient({
		type: 'work-queue-consumer(n8n)',
	});
	const stepConsumer = redisClientService.createClient({ type: 'work-queue-consumer(n8n)' });

	return {
		queues: {
			orchestration: new RedisWorkQueue({
				publisher,
				consumer: orchestrationConsumer,
				key: `${prefix}:engine-v2-queue:orchestration`,
				parse: (value) => orchestrationMessageSchema.parse(value),
				logger,
			}),
			step: new RedisWorkQueue({
				publisher,
				consumer: stepConsumer,
				key: `${prefix}:engine-v2-queue:step`,
				parse: (value) => stepMessageSchema.parse(value),
				logger,
			}),
		},
		close: () => {
			for (const client of [orchestrationConsumer, stepConsumer]) client.disconnect();
		},
	};
}

import type { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { RedisWorkQueues, WorkQueuePublisherClient } from '@n8n/engine';
import { createRedisWorkQueues } from '@n8n/engine';

/**
 * Creates the engine work queues on the Redis of this instance. The caller
 * owns `publisher` and closes it.
 */
export async function createInstanceRedisWorkQueues(
	publisher: WorkQueuePublisherClient,
	logger: Logger,
	concurrency: { orchestration: number; step: number },
): Promise<RedisWorkQueues> {
	const { RedisClientService } = await import('@n8n/backend-services');
	const redisClientService = Container.get(RedisClientService);

	return createRedisWorkQueues({
		publisher,
		createConsumer: () => redisClientService.createClient({ type: 'work-queue-consumer(n8n)' }),
		keyPrefix: redisClientService.toValidPrefix(Container.get(GlobalConfig).redis.prefix),
		concurrency,
		logger,
	});
}

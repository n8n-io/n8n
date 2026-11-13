import type { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { ExecutionChannelTopic } from '@n8n/engine';

import type { RedisChannelPublisher } from './redis-execution-channel-publisher';

export type RedisExecutionChannelNameGenerator = (
	topic: ExecutionChannelTopic,
	executionId: string,
) => string;

/** Both planes must derive the same channel name, so they share this helper. */
async function createChannelNameGenerator(): Promise<RedisExecutionChannelNameGenerator> {
	const { RedisClientService } = await import('@n8n/backend-services');
	const prefix = Container.get(RedisClientService).toValidPrefix(
		Container.get(GlobalConfig).redis.prefix,
	);

	return (topic, executionId) => `${prefix}:engine-v2-${topic}:${executionId}`;
}

/**
 * Creates the data plane end of the Redis execution channel. It disconnects
 * `client` when it stops.
 */
export async function createRedisExecutionChannelPublisher(
	client: RedisChannelPublisher,
	logger: Logger,
) {
	const { RedisExecutionChannelPublisher } = await import('./redis-execution-channel-publisher.js');

	return new RedisExecutionChannelPublisher(client, await createChannelNameGenerator(), logger);
}

/** Creates and starts the control plane end of the Redis execution channel. */
export async function startRedisExecutionChannelSubscriber(logger: Logger) {
	const { RedisClientService } = await import('@n8n/backend-services');
	const { RedisExecutionChannelSubscriber } = await import(
		'./redis-execution-channel-subscriber.js'
	);

	const subscriber = new RedisExecutionChannelSubscriber(
		Container.get(RedisClientService).createClient({ type: 'subscriber(n8n)' }),
		await createChannelNameGenerator(),
		logger,
	);
	try {
		await subscriber.start();
	} catch (error) {
		await subscriber.stop();
		throw error;
	}

	return subscriber;
}

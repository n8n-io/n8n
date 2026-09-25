import type { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

export type RedisExecutionResponseChannelNameGenerator = (executionId: string) => string;

/** Both planes must derive the same channel name, so they share this helper. */
async function createChannelNameGenerator(): Promise<RedisExecutionResponseChannelNameGenerator> {
	const { RedisClientService } = await import('@/services/redis-client.service.js');
	const prefix = Container.get(RedisClientService).toValidPrefix(
		Container.get(GlobalConfig).redis.prefix,
	);
	const channelPrefix = `${prefix}:engine-v2-responses`;

	return (executionId) => `${channelPrefix}:${executionId}`;
}

/** Creates the data plane end of the Redis response channel. */
export async function createRedisExecutionResponseSender(logger: Logger) {
	const { RedisClientService } = await import('@/services/redis-client.service.js');
	const { RedisExecutionResponseSender } = await import('./redis-execution-response-sender.js');

	return new RedisExecutionResponseSender(
		Container.get(RedisClientService).createClient({ type: 'publisher(n8n)' }),
		await createChannelNameGenerator(),
		logger,
	);
}

/** Creates and starts the control plane end of the Redis response channel. */
export async function startRedisExecutionResponseReceiver(logger: Logger) {
	const { RedisClientService } = await import('@/services/redis-client.service.js');
	const { RedisExecutionResponseReceiver } = await import('./redis-execution-response-receiver.js');

	const receiver = new RedisExecutionResponseReceiver(
		Container.get(RedisClientService).createClient({ type: 'subscriber(n8n)' }),
		await createChannelNameGenerator(),
		logger,
	);
	try {
		await receiver.start();
	} catch (error) {
		await receiver.stop();
		throw error;
	}

	return receiver;
}

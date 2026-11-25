import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';
import type {
	WorkQueueConsumer,
	WorkQueueConsumerOptions,
	WorkQueueFactory,
	WorkQueuePublisher,
	WorkQueuePublisherClient,
} from '@n8n/engine';
import { RedisWorkQueueConsumer, RedisWorkQueuePublisher } from '@n8n/engine';

export interface RedisWorkQueueFactory extends WorkQueueFactory {
	/**
	 * Disconnects every consumer connection that the factory opened. Call it after
	 * the engine stopped its consumers and before the publisher closes, so that a
	 * fetch still pending fails instead of taking a message.
	 */
	close(): void;
}

/**
 * Creates engine work queues on the Redis of this instance. Every engine
 * process with the same key prefix shares the same lists. Each consumer gets its
 * own connection, because a blocking pop holds it. The caller owns `publisher`
 * and closes it.
 */
export async function createInstanceRedisWorkQueueFactory(
	publisher: WorkQueuePublisherClient,
): Promise<RedisWorkQueueFactory> {
	const { RedisClientService } = await import('@n8n/backend-services');
	const redisClientService = Container.get(RedisClientService);
	const keyPrefix = redisClientService.toValidPrefix(Container.get(GlobalConfig).redis.prefix);
	const keyOf = (name: string) => `${keyPrefix}:engine-v2-queue:${name}`;
	const consumerClients: Array<ReturnType<typeof redisClientService.createClient>> = [];

	return {
		createPublisher: <TMessage>(name: string): WorkQueuePublisher<TMessage> =>
			new RedisWorkQueuePublisher<TMessage>(publisher, keyOf(name)),
		createConsumer: <TMessage>(
			name: string,
			{ concurrency, parse, logger }: WorkQueueConsumerOptions<TMessage>,
		): WorkQueueConsumer<TMessage> => {
			const client = redisClientService.createClient({ type: 'work-queue-consumer(n8n)' });
			consumerClients.push(client);
			return new RedisWorkQueueConsumer<TMessage>({
				client,
				publisher,
				key: keyOf(name),
				parse,
				logger,
				concurrency,
			});
		},
		close: () => {
			for (const client of consumerClients.splice(0)) client.disconnect();
		},
	};
}

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';

import { RedisClientService } from '@/services/redis-client.service';

import type { MessageTransport } from './message-transport.interface';

type RedisClient = SingleNodeClient | MultiNodeClient;

type MessageHandler = (message: string, channel: string) => void;

/**
 * Redis-backed `MessageTransport`, extracted from `Publisher`/`Subscriber`'s
 * previous direct Redis usage. Keeps their dedicated publish/subscribe client
 * split: a Redis client that has issued `SUBSCRIBE` can no longer run most other
 * commands, so publishing and subscribing each need their own connection.
 */
@Service()
export class RedisMessageTransport implements MessageTransport {
	private publisherClient?: RedisClient;

	private subscriberClient?: RedisClient;

	private readonly handlersByChannel = new Map<string, MessageHandler[]>();

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
	) {
		this.logger = this.logger.scoped(['scaling', 'pubsub']);
	}

	async publish(channel: string, message: string) {
		this.publisherClient ??= this.redisClientService.createClient({ type: 'publisher(n8n)' });

		await this.publisherClient.publish(channel, message);
	}

	async subscribe(channel: string, onMessage: MessageHandler) {
		if (!this.subscriberClient) {
			this.subscriberClient = this.redisClientService.createClient({ type: 'subscriber(n8n)' });
			this.subscriberClient.on('message', (subscribedChannel: string, message: string) => {
				for (const handler of this.handlersByChannel.get(subscribedChannel) ?? []) {
					handler(message, subscribedChannel);
				}
			});
		}

		const handlers = this.handlersByChannel.get(channel) ?? [];
		handlers.push(onMessage);
		this.handlersByChannel.set(channel, handlers);

		await this.subscriberClient.subscribe(channel, (error) => {
			if (error) {
				this.logger.error(`Failed to subscribe to channel ${channel}`, { error });
				return;
			}

			this.logger.debug(`Subscribed to channel ${channel}`);
		});
	}

	shutdown() {
		this.publisherClient?.disconnect();
		this.subscriberClient?.disconnect();
	}
}

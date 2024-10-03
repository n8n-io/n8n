import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import { Service } from 'typedi';

import config from '@/config';
import { Logger } from '@/logging/logger.service';
import { RedisClientService } from '@/services/redis-client.service';

import type { PubSub } from './pubsub.types';

/**
 * Responsible for subscribing to the pubsub channels used by scaling mode.
 */
@Service()
export class Subscriber {
	private readonly client: SingleNodeClient | MultiNodeClient;

	private readonly handlers: Map<PubSub.Channel, PubSub.HandlerFn> = new Map();

	// #region Lifecycle

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
	) {
		// @TODO: Once this class is only ever initialized in scaling mode, throw in the next line instead.
		if (config.getEnv('executions.mode') !== 'queue') return;

		this.client = this.redisClientService.createClient({ type: 'subscriber(n8n)' });

		this.client.on('message', (channel: PubSub.Channel, message) => {
			this.handlers.get(channel)?.(message);
		});
	}

	getClient() {
		return this.client;
	}

	// @TODO: Use `@OnShutdown()` decorator
	shutdown() {
		this.client.disconnect();
	}

	// #endregion

	// #region Subscribing

	async subscribe(channel: PubSub.Channel) {
		await this.client.subscribe(channel, (error) => {
			if (error) {
				this.logger.error('Failed to subscribe to channel', { channel, cause: error });
				return;
			}

			this.logger.debug('Subscribed to channel', { channel });
		});
	}

	/** Set the message handler function for a channel. */
	setMessageHandler(channel: PubSub.Channel, handlerFn: PubSub.HandlerFn) {
		this.handlers.set(channel, handlerFn);
	}

	// #endregion
}

import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import { Service } from 'typedi';

import config from '@/config';
import { Logger } from '@/logger';
import { RedisClientService } from '@/services/redis/redis-client.service';

import type { PubSubChannel } from './pubsub.types';

/**
 * Responsible for subscribing to the pubsub channels used by scaling mode.
 */
@Service()
export class Subscriber {
	private readonly client: SingleNodeClient | MultiNodeClient;

	// #region Lifecycle

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
	) {
		// @TODO: Once this class is only ever initialized in scaling mode, throw in the next line instead.
		if (config.getEnv('executions.mode') !== 'queue') return;

		this.client = this.redisClientService.createClient({ type: 'subscriber(n8n)' });

		this.client.on('error', (error) => this.logger.error(error.message));
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

	async subscribe(channel: PubSubChannel) {
		await this.client.subscribe(channel, (error) => {
			if (error) {
				this.logger.error('Failed to subscribe to channel', { channel, cause: error });
				return;
			}

			this.logger.debug('Subscribed to channel', { channel });
		});
	}

	setHandler(handlerFn: (channel: string, msg: string) => void) {
		this.client.on('message', handlerFn);
	}

	// #endregion
}

import { Service } from 'typedi';
import { RedisClientService } from '@/services/redis/redis-client.service';
import { Logger } from '@/logger';
import config from '@/config';
import type { PubSubChannel } from './pubsub.types';
import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';

/**
 * Responsible for subscribing to the pub/sub channels used by scaling mode.
 */
@Service()
export class Subscriber {
	private readonly client: SingleNodeClient | MultiNodeClient;

	// #region Lifecycle

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
	) {
		if (config.getEnv('executions.mode') !== 'queue') return;

		this.client = this.redisClientService.createClient({ type: 'subscriber(n8n)' });

		this.client.on('error', (error) => this.logger.error(error.message));
	}

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

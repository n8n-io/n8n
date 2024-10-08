import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import debounce from 'lodash/debounce';
import { jsonParse } from 'n8n-workflow';
import { Service } from 'typedi';

import config from '@/config';
import { EventService } from '@/events/event.service';
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
		private readonly eventService: EventService,
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

	// #region Commands

	setCommandMessageHandler() {
		const handlerFn = debounce((str: string) => {
			const msg = this.parseCommandMessage(str);
			if (msg) this.eventService.emit(msg.command, msg.payload);
		}, 300);

		this.setMessageHandler('n8n.commands', handlerFn);
	}

	private parseCommandMessage(str: string) {
		const msg = jsonParse<PubSub.Command | null>(str, { fallbackValue: null });

		if (!msg) {
			this.logger.debug('Received invalid string via command channel', { message: str });

			return null;
		}

		this.logger.debug('Received message via command channel', msg);

		const queueModeId = config.getEnv('redis.queueModeId');

		if (msg.senderId === queueModeId || (msg.targets && !msg.targets.includes(queueModeId))) {
			this.logger.debug('Disregarding message - not for this instance', msg);

			return null;
		}

		return msg;
	}

	// #endregion
}

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

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
		private readonly eventService: EventService,
	) {
		// @TODO: Once this class is only ever initialized in scaling mode, throw in the next line instead.
		if (config.getEnv('executions.mode') !== 'queue') return;

		this.client = this.redisClientService.createClient({ type: 'subscriber(n8n)' });

		const handlerFn = (msg: PubSub.Command | PubSub.WorkerResponse) => {
			const eventName = 'command' in msg ? msg.command : msg.response;
			this.eventService.emit(eventName, msg.payload);
		};

		const debouncedHandlerFn = debounce(handlerFn, 300);

		this.client.on('message', (_channel: PubSub.Channel, str) => {
			const msg = this.parseCommandMessage(str);
			if (!msg) return;
			if (msg.debounce) debouncedHandlerFn(msg);
			else handlerFn(msg);
		});
	}

	// @TODO: Use `@OnShutdown()` decorator
	shutdown() {
		this.client.disconnect();
	}

	async subscribe(channel: PubSub.Channel) {
		await this.client.subscribe(channel, (error) => {
			if (error) {
				this.logger.error('Failed to subscribe to channel', { channel, cause: error });
				return;
			}

			this.logger.debug('Subscribed to channel', { channel });
		});
	}

	private parseCommandMessage(str: string) {
		const msg = jsonParse<PubSub.Command | null>(str, { fallbackValue: null });

		if (!msg) {
			this.logger.debug('Received invalid string via command channel', { message: str });

			return null;
		}

		this.logger.debug('Received message via command channel', msg);

		const queueModeId = config.getEnv('redis.queueModeId');

		if (
			!msg.selfSend &&
			(msg.senderId === queueModeId || (msg.targets && !msg.targets.includes(queueModeId)))
		) {
			this.logger.debug('Disregarding message - not for this instance', msg);

			return null;
		}

		return msg;
	}

	getClient() {
		return this.client;
	}
}

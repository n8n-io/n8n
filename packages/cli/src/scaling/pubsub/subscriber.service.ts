import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import debounce from 'lodash/debounce';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { Service } from 'typedi';

import config from '@/config';
import { EventService } from '@/events/event.service';
import { Logger } from '@/logging/logger.service';
import type { LogMetadata } from '@/logging/types';
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
		private readonly instanceSettings: InstanceSettings,
	) {
		// @TODO: Once this class is only ever initialized in scaling mode, throw in the next line instead.
		if (config.getEnv('executions.mode') !== 'queue') return;

		this.logger = this.logger.scoped(['scaling', 'pubsub']);

		this.client = this.redisClientService.createClient({ type: 'subscriber(n8n)' });

		const handlerFn = (msg: PubSub.Command | PubSub.WorkerResponse) => {
			const eventName = 'command' in msg ? msg.command : msg.response;
			this.eventService.emit(eventName, msg.payload);
		};

		const debouncedHandlerFn = debounce(handlerFn, 300);

		this.client.on('message', (channel: PubSub.Channel, str) => {
			const msg = this.parseMessage(str, channel);
			if (!msg) return;
			if (msg.debounce) debouncedHandlerFn(msg);
			else handlerFn(msg);
		});
	}

	getClient() {
		return this.client;
	}

	// @TODO: Use `@OnShutdown()` decorator
	shutdown() {
		this.client.disconnect();
	}

	async subscribe(channel: PubSub.Channel) {
		await this.client.subscribe(channel, (error) => {
			if (error) {
				this.logger.error(`Failed to subscribe to channel ${channel}`, { error });
				return;
			}

			this.logger.debug(`Subscribed to channel ${channel}`);
		});
	}

	private parseMessage(str: string, channel: PubSub.Channel) {
		const msg = jsonParse<PubSub.Command | PubSub.WorkerResponse | null>(str, {
			fallbackValue: null,
		});

		if (!msg) {
			this.logger.error('Received malformed pubsub message', {
				msg: str,
				channel,
			});
			return null;
		}

		const { hostId } = this.instanceSettings;

		if (
			'command' in msg &&
			!msg.selfSend &&
			(msg.senderId === hostId || (msg.targets && !msg.targets.includes(hostId)))
		) {
			return null;
		}

		let msgName = 'command' in msg ? msg.command : msg.response;

		const metadata: LogMetadata = { msg: msgName, channel };

		if ('command' in msg && msg.command === 'relay-execution-lifecycle-event') {
			const { args, type } = msg.payload;
			msgName += ` (${type})`;
			metadata.type = type;
			metadata.executionId = args.executionId;
		}

		this.logger.debug(`Received pubsub msg: ${msgName}`, metadata);

		return msg;
	}
}

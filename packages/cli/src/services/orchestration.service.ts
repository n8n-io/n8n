import { Service } from 'typedi';
import { RedisService } from './redis.service';
import type { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';
import type { RedisServicePubSubSubscriber } from './redis/RedisServicePubSubSubscriber';
import { LoggerProxy, jsonParse } from 'n8n-workflow';
import { eventBus } from '../eventbus';
import type { AbstractEventMessageOptions } from '../eventbus/EventMessageClasses/AbstractEventMessageOptions';
import { getEventMessageObjectByType } from '../eventbus/EventMessageClasses/Helpers';
import type {
	RedisServiceCommandObject,
	RedisServiceWorkerResponseObject,
} from './redis/RedisServiceCommands';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from './redis/RedisServiceHelper';

@Service()
export class OrchestrationService {
	private initialized = false;

	private _uniqueInstanceId = '';

	get uniqueInstanceId(): string {
		return this._uniqueInstanceId;
	}

	redisPublisher: RedisServicePubSubPublisher;

	redisSubscriber: RedisServicePubSubSubscriber;

	constructor(readonly redisService: RedisService) {}

	async init(uniqueInstanceId: string) {
		this._uniqueInstanceId = uniqueInstanceId;
		await this.initPublisher();
		await this.initSubscriber();
		this.initialized = true;
	}

	async shutdown() {
		await this.redisPublisher?.destroy();
		await this.redisSubscriber?.destroy();
	}

	private async initPublisher() {
		this.redisPublisher = await this.redisService.getPubSubPublisher();
	}

	private async initSubscriber() {
		this.redisSubscriber = await this.redisService.getPubSubSubscriber();

		// TODO: these are all proof of concept implementations for the moment
		// until worker communication is implemented
		// #region proof of concept
		await this.redisSubscriber.subscribeToEventLog();
		await this.redisSubscriber.subscribeToWorkerResponseChannel();
		await this.redisSubscriber.subscribeToCommandChannel();

		this.redisSubscriber.addMessageHandler(
			'OrchestrationMessageReceiver',
			async (channel: string, messageString: string) => {
				// TODO: this is a proof of concept implementation to forward events to the main instance's event bus
				// Events are arriving through a pub/sub channel and are forwarded to the eventBus
				// In the future, a stream should probably replace this implementation entirely
				if (channel === EVENT_BUS_REDIS_CHANNEL) {
					await this.handleEventBusMessage(messageString);
				} else if (channel === WORKER_RESPONSE_REDIS_CHANNEL) {
					await this.handleWorkerResponseMessage(messageString);
				} else if (channel === COMMAND_REDIS_CHANNEL) {
					await this.handleCommandMessage(messageString);
				}
			},
		);
	}

	async handleWorkerResponseMessage(messageString: string) {
		const workerResponse = jsonParse<RedisServiceWorkerResponseObject>(messageString);
		if (workerResponse) {
			// TODO: Handle worker response
			LoggerProxy.debug('Received worker response', workerResponse);
		}
		return workerResponse;
	}

	async handleEventBusMessage(messageString: string) {
		const eventData = jsonParse<AbstractEventMessageOptions>(messageString);
		if (eventData) {
			const eventMessage = getEventMessageObjectByType(eventData);
			if (eventMessage) {
				await eventBus.send(eventMessage);
			}
		}
		return eventData;
	}

	async handleCommandMessage(messageString: string) {
		if (!messageString) return;
		let message: RedisServiceCommandObject;
		try {
			message = jsonParse<RedisServiceCommandObject>(messageString);
		} catch {
			LoggerProxy.debug(
				`Received invalid message via channel ${COMMAND_REDIS_CHANNEL}: "${messageString}"`,
			);
			return;
		}
		if (message) {
			if (
				message.senderId === this.uniqueInstanceId ||
				(message.targets && !message.targets.includes(this.uniqueInstanceId))
			) {
				LoggerProxy.debug(
					`Skipping command message ${message.command} because it's not for this instance.`,
				);
				return message;
			}
			switch (message.command) {
				case 'restartEventBus':
					await eventBus.restart();
					break;
			}
			return message;
		}
		return;
	}

	async getWorkerStatus(id?: string) {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			senderId: this.uniqueInstanceId,
			command: 'getStatus',
			targets: id ? [id] : undefined,
		});
	}

	async getWorkerIds() {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			senderId: this.uniqueInstanceId,
			command: 'getId',
		});
	}

	// TODO: not implemented yet on worker side
	async stopWorker(id?: string) {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			senderId: this.uniqueInstanceId,
			command: 'stopWorker',
			targets: id ? [id] : undefined,
		});
	}

	async restartEventBus(id?: string) {
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			senderId: this.uniqueInstanceId,
			command: 'restartEventBus',
			targets: id ? [id] : undefined,
		});
	}
}

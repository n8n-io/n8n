import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from './RedisServiceHelper';
import { RedisServiceBaseReceiver } from './RedisServiceBaseClasses';

@Service()
export class RedisServicePubSubSubscriber extends RedisServiceBaseReceiver {
	async init(): Promise<void> {
		await super.init('subscriber');

		this.redisClient?.on('message', (channel: string, message: string) => {
			this.messageHandlers.forEach((handler: (channel: string, message: string) => void) =>
				handler(channel, message),
			);
		});
	}

	async subscribe(channel: string): Promise<void> {
		if (!this.redisClient) {
			await this.init();
		}
		await this.redisClient?.subscribe(channel, (error, _count: number) => {
			if (error) {
				Logger.error(`Error subscribing to channel ${channel}`);
			} else {
				Logger.debug(`Subscribed Redis PubSub client to channel: ${channel}`);
			}
		});
	}

	async subscribeToEventLog(): Promise<void> {
		await this.subscribe(EVENT_BUS_REDIS_CHANNEL);
	}

	async subscribeToCommandChannel(): Promise<void> {
		await this.subscribe(COMMAND_REDIS_CHANNEL);
	}

	async subscribeToWorkerResponseChannel(): Promise<void> {
		await this.subscribe(WORKER_RESPONSE_REDIS_CHANNEL);
	}
}

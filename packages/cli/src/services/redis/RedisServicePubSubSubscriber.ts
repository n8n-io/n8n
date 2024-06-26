import { Service } from 'typedi';
import { COMMAND_REDIS_CHANNEL, WORKER_RESPONSE_REDIS_CHANNEL } from './RedisConstants';
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
				this.logger.error(`Error subscribing to channel ${channel}`);
			} else {
				this.logger.debug(`Subscribed Redis PubSub client to channel: ${channel}`);
			}
		});
	}

	async unsubscribe(channel: string): Promise<void> {
		if (!this.redisClient) {
			return;
		}
		await this.redisClient?.unsubscribe(channel, (error, _count: number) => {
			if (error) {
				this.logger.error(`Error unsubscribing from channel ${channel}`);
			} else {
				this.logger.debug(`Unsubscribed Redis PubSub client from channel: ${channel}`);
			}
		});
	}

	async subscribeToCommandChannel(): Promise<void> {
		await this.subscribe(COMMAND_REDIS_CHANNEL);
	}

	async subscribeToWorkerResponseChannel(): Promise<void> {
		await this.subscribe(WORKER_RESPONSE_REDIS_CHANNEL);
	}

	async unSubscribeFromCommandChannel(): Promise<void> {
		await this.unsubscribe(COMMAND_REDIS_CHANNEL);
	}

	async unSubscribeFromWorkerResponseChannel(): Promise<void> {
		await this.unsubscribe(WORKER_RESPONSE_REDIS_CHANNEL);
	}
}

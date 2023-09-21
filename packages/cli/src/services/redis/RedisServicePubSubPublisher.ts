import { Service } from 'typedi';
import type { AbstractEventMessage } from '@/eventbus/EventMessageClasses/AbstractEventMessage';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from './RedisServiceHelper';
import type { RedisServiceCommandObject } from './RedisServiceCommands';
import { RedisServiceBaseSender } from './RedisServiceBaseClasses';

@Service()
export class RedisServicePubSubPublisher extends RedisServiceBaseSender {
	readonly type = 'publisher';

	async publish(channel: string, message: string): Promise<void> {
		if (!this.redisClient) {
			await this.init();
		}
		await this.redisClient?.publish(channel, message);
	}

	async publishToEventLog(message: AbstractEventMessage): Promise<void> {
		await this.publish(EVENT_BUS_REDIS_CHANNEL, message.toString());
	}

	async publishToCommandChannel(
		message: Omit<RedisServiceCommandObject, 'senderId'>,
	): Promise<void> {
		await this.publish(
			COMMAND_REDIS_CHANNEL,
			JSON.stringify({ ...message, senderId: this.senderId }),
		);
	}

	async publishToWorkerChannel(
		message: Omit<RedisServiceCommandObject, 'senderId'>,
	): Promise<void> {
		await this.publish(
			WORKER_RESPONSE_REDIS_CHANNEL,
			JSON.stringify({ ...message, senderId: this.senderId }),
		);
	}
}

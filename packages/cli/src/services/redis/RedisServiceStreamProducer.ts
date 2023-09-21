import type { RedisValue } from 'ioredis';
import { Service } from 'typedi';
import type { AbstractEventMessage } from '@/eventbus/EventMessageClasses/AbstractEventMessage';
import {
	COMMAND_REDIS_STREAM,
	EVENT_BUS_REDIS_STREAM,
	WORKER_RESPONSE_REDIS_STREAM,
} from './RedisServiceHelper';
import type {
	RedisServiceCommandObject,
	RedisServiceWorkerResponseObject,
} from './RedisServiceCommands';
import { RedisServiceBaseSender } from './RedisServiceBaseClasses';

@Service()
export class RedisServiceStreamProducer extends RedisServiceBaseSender {
	readonly type = 'producer';

	async add(streamName: string, values: RedisValue[]): Promise<void> {
		await this.redisClient?.xadd(streamName, '*', 'senderId', this.senderId, ...values);
	}

	async addToEventStream(message: AbstractEventMessage): Promise<void> {
		await this.add(EVENT_BUS_REDIS_STREAM, [
			'message',
			message.eventName,
			'event',
			message.toString(),
		]);
	}

	async addToCommandChannel(message: RedisServiceCommandObject): Promise<void> {
		await this.add(COMMAND_REDIS_STREAM, ['command', JSON.stringify(message)]);
	}

	async addToWorkerChannel(message: RedisServiceWorkerResponseObject): Promise<void> {
		await this.add(WORKER_RESPONSE_REDIS_STREAM, ['response', JSON.stringify(message)]);
	}
}

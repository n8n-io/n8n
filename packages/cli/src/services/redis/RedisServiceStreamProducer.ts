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
	async init(senderId?: string): Promise<void> {
		await super.init('producer');
		RedisServiceStreamProducer.setSenderId(senderId);
	}

	async add(streamName: string, values: RedisValue[]): Promise<void> {
		await RedisServiceStreamProducer.redisClient?.xadd(
			streamName,
			'*',
			'senderId',
			RedisServiceStreamProducer.senderId,
			...values,
		);
	}

	async addToEventStream(message: AbstractEventMessage): Promise<void> {
		await this.add(EVENT_BUS_REDIS_STREAM, [
			'message',
			message.eventName,
			'event',
			message.toString(),
		]);
	}

	async publishToCommandChannel(message: RedisServiceCommandObject): Promise<void> {
		await this.add(COMMAND_REDIS_STREAM, ['command', JSON.stringify(message)]);
	}

	async publishToWorkerChannel(message: RedisServiceWorkerResponseObject): Promise<void> {
		await this.add(WORKER_RESPONSE_REDIS_STREAM, ['response', JSON.stringify(message)]);
	}
}

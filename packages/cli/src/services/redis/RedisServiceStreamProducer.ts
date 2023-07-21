import type Redis from 'ioredis';
import type { Cluster, RedisValue } from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { AbstractEventMessage } from '@/eventbus/EventMessageClasses/AbstractEventMessage';
import {
	COMMAND_REDIS_STREAM,
	EVENT_BUS_REDIS_STREAM,
	WORKER_RESPONSE_REDIS_STREAM,
	getDefaultRedisClient,
} from './RedisServiceHelper';
import type {
	RedisServiceCommandObject,
	RedisServiceWorkerResponseObject,
} from './RedisServiceCommands';
import { RedisServiceBaseSender } from './RedisServiceBaseClasses';

@Service()
export class RedisServiceStreamProducer extends RedisServiceBaseSender {
	async init(senderId: string): Promise<Redis | Cluster> {
		if (RedisServiceStreamProducer.redisClient && RedisServiceStreamProducer.isInitialized) {
			return RedisServiceStreamProducer.redisClient;
		}
		RedisServiceStreamProducer.senderId = senderId;
		RedisServiceStreamProducer.redisClient = await getDefaultRedisClient(undefined, 'producer');
		RedisServiceStreamProducer.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServiceStreamProducer.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		return RedisServiceStreamProducer.redisClient;
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

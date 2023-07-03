import type Redis from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { AbstractEventMessage } from '../eventbus/EventMessageClasses/AbstractEventMessage';
import {
	COMMAND_REDIS_STREAM,
	EVENT_BUS_REDIS_STREAM,
	WORKER_RESPONSE_REDIS_STREAM,
	getRedisClient,
} from './RedisServiceHelper';
import type {
	RedisServiceCommandObject,
	RedisServiceWorkerResponseObject,
} from './RedisServiceCommands';
import type { RedisValue } from 'ioredis';

type MessageHandler = (channel: string, message: string) => void;

@Service()
export class RedisServiceProducer {
	static producerId = '';

	static redisClient: Redis | undefined;

	static messageHandlers: Map<string, MessageHandler> = new Map();

	static isInitialized = false;

	async init(producerId: string): Promise<Redis> {
		if (RedisServiceProducer.redisClient && RedisServiceProducer.isInitialized) {
			return RedisServiceProducer.redisClient;
		}
		RedisServiceProducer.producerId = producerId;
		RedisServiceProducer.redisClient = await getRedisClient();
		RedisServiceProducer.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServiceProducer.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		return RedisServiceProducer.redisClient;
	}

	static async close(): Promise<void> {
		if (!RedisServiceProducer.redisClient) {
			return;
		}
		await RedisServiceProducer.redisClient.quit();
		RedisServiceProducer.redisClient = undefined;
	}

	async add(streamName: string, values: RedisValue[]): Promise<void> {
		await RedisServiceProducer.redisClient?.xadd(
			streamName,
			'*',
			'producerId',
			RedisServiceProducer.producerId,
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

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
export class RedisServiceConsumer {
	static producerId = '';

	static redisClient: Redis | undefined;

	static messageHandlers: Map<string, MessageHandler> = new Map();

	static isInitialized = false;

	async init(producerId: string): Promise<Redis> {
		if (RedisServiceConsumer.redisClient && RedisServiceConsumer.isInitialized) {
			return RedisServiceConsumer.redisClient;
		}
		RedisServiceConsumer.producerId = producerId;
		RedisServiceConsumer.redisClient = await getRedisClient();
		RedisServiceConsumer.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServiceConsumer.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		return RedisServiceConsumer.redisClient;
	}

	static async close(): Promise<void> {
		if (!RedisServiceConsumer.redisClient) {
			return;
		}
		await RedisServiceConsumer.redisClient.quit();
		RedisServiceConsumer.redisClient = undefined;
	}

	async subscribe(channel: string): Promise<void> {
		// tbd
	}
}

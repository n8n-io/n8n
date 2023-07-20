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

type MessageHandler = (channel: string, message: string) => void;

@Service()
export class RedisServiceStreamConsumer {
	static producerId = '';

	static redisClient: Redis | Cluster | undefined;

	static messageHandlers: Map<string, MessageHandler> = new Map();

	static isInitialized = false;

	async init(producerId: string): Promise<Redis | Cluster> {
		if (RedisServiceStreamConsumer.redisClient && RedisServiceStreamConsumer.isInitialized) {
			return RedisServiceStreamConsumer.redisClient;
		}
		RedisServiceStreamConsumer.producerId = producerId;
		RedisServiceStreamConsumer.redisClient = await getDefaultRedisClient();
		RedisServiceStreamConsumer.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServiceStreamConsumer.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		return RedisServiceStreamConsumer.redisClient;
	}

	static async close(): Promise<void> {
		if (!RedisServiceStreamConsumer.redisClient) {
			return;
		}
		await RedisServiceStreamConsumer.redisClient.quit();
		RedisServiceStreamConsumer.redisClient = undefined;
	}

	async subscribe(channel: string): Promise<void> {
		// tbd
	}
}

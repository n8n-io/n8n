import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { getDefaultRedisClient } from './RedisServiceHelper';
import { LoggerProxy } from 'n8n-workflow';

export type RedisClientType =
	| 'subscriber'
	| 'client'
	| 'bclient'
	| 'subscriber(bull)'
	| 'client(bull)'
	| 'bclient(bull)'
	| 'publisher'
	| 'consumer'
	| 'producer'
	| 'list-sender'
	| 'list-receiver';

export type RedisServiceMessageHandler =
	| ((channel: string, message: string) => void)
	| ((stream: string, id: string, message: string[]) => void);

class RedisServiceBase {
	static redisClient: Redis | Cluster | undefined;

	static isInitialized = false;

	async init(type: RedisClientType = 'client'): Promise<void> {
		if (RedisServiceBase.redisClient && RedisServiceBase.isInitialized) {
			return;
		}
		RedisServiceBase.redisClient = await getDefaultRedisClient(undefined, type);

		RedisServiceBase.redisClient.on('close', () => {
			LoggerProxy.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServiceBase.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				LoggerProxy.warn('Error with Redis: ', error);
			}
		});
	}

	static async close(): Promise<void> {
		if (!RedisServiceBase.redisClient) {
			return;
		}
		await RedisServiceBase.redisClient.quit();
		RedisServiceBase.redisClient = undefined;
	}
}

export abstract class RedisServiceBaseSender extends RedisServiceBase {
	static senderId: string;

	static setSenderId(senderId?: string): void {
		RedisServiceBaseSender.senderId = senderId ?? '';
	}
}

export abstract class RedisServiceBaseReceiver extends RedisServiceBase {
	static messageHandlers: Map<string, RedisServiceMessageHandler> = new Map();

	addMessageHandler(handlerName: string, handler: RedisServiceMessageHandler): void {
		RedisServiceBaseReceiver.messageHandlers.set(handlerName, handler);
	}

	removeMessageHandler(handlerName: string): void {
		RedisServiceBaseReceiver.messageHandlers.delete(handlerName);
	}
}

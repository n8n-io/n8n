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
	| 'client(cache)'
	| 'publisher'
	| 'consumer'
	| 'producer'
	| 'list-sender'
	| 'list-receiver';

export type RedisServiceMessageHandler =
	| ((channel: string, message: string) => void)
	| ((stream: string, id: string, message: string[]) => void);

class RedisServiceBase {
	redisClient: Redis | Cluster | undefined;

	isInitialized = false;

	async init(type: RedisClientType = 'client'): Promise<void> {
		if (this.redisClient && this.isInitialized) {
			return;
		}
		this.redisClient = await getDefaultRedisClient(undefined, type);

		this.redisClient.on('close', () => {
			LoggerProxy.warn('Redis unavailable - trying to reconnect...');
		});

		this.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				LoggerProxy.warn('Error with Redis: ', error);
			}
		});
	}

	async destroy(): Promise<void> {
		if (!this.redisClient) {
			return;
		}
		await this.redisClient.quit();
		this.redisClient = undefined;
	}
}

export abstract class RedisServiceBaseSender extends RedisServiceBase {
	senderId: string;

	setSenderId(senderId?: string): void {
		this.senderId = senderId ?? '';
	}
}

export abstract class RedisServiceBaseReceiver extends RedisServiceBase {
	messageHandlers: Map<string, RedisServiceMessageHandler> = new Map();

	addMessageHandler(handlerName: string, handler: RedisServiceMessageHandler): void {
		this.messageHandlers.set(handlerName, handler);
	}

	removeMessageHandler(handlerName: string): void {
		this.messageHandlers.delete(handlerName);
	}
}

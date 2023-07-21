import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';

export type RedisServiceMessageHandler =
	| ((channel: string, message: string) => void)
	| ((stream: string, id: string, message: string[]) => void);

abstract class RedisServiceBase {
	static redisClient: Redis | Cluster | undefined;

	static isInitialized = false;

	abstract init(): Promise<Redis | Cluster>;

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

	abstract init(senderId?: string): Promise<Redis | Cluster>;
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

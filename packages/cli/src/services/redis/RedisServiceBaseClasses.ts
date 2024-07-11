import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { Service } from 'typedi';
import config from '@/config';
import { Logger } from '@/Logger';
import { RedisClientService } from './redis-client.service';

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

@Service()
class RedisServiceBase {
	redisClient: Redis | Cluster | undefined;

	isInitialized = false;

	constructor(
		protected readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
	) {}

	async init(type: RedisClientType = 'client'): Promise<void> {
		if (this.redisClient && this.isInitialized) {
			return;
		}
		this.redisClient = this.redisClientService.createClient({ type });

		this.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				this.logger.warn('Error with Redis: ', error);
			}
		});
	}

	async destroy(): Promise<void> {
		if (!this.redisClient) {
			return;
		}
		await this.redisClient.quit();
		this.isInitialized = false;
		this.redisClient = undefined;
	}
}

export abstract class RedisServiceBaseSender extends RedisServiceBase {
	senderId: string;

	async init(type: RedisClientType = 'client'): Promise<void> {
		await super.init(type);
		this.senderId = config.get('redis.queueModeId');
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

import type Redis from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	getRedisClient,
} from './RedisServiceHelper';

type MessageHandler = (channel: string, message: string) => void;

@Service()
export class RedisServiceSubscriber {
	static redisClient: Redis | undefined;

	static messageHandlers: Map<string, MessageHandler> = new Map();

	static isInitialized = false;

	async init(): Promise<Redis> {
		if (RedisServiceSubscriber.redisClient && RedisServiceSubscriber.isInitialized) {
			return RedisServiceSubscriber.redisClient;
		}

		RedisServiceSubscriber.redisClient = await getRedisClient();

		RedisServiceSubscriber.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServiceSubscriber.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		RedisServiceSubscriber.redisClient.on('message', (channel: string, message: string) => {
			RedisServiceSubscriber.messageHandlers.forEach((handler) => handler(channel, message));
		});

		return RedisServiceSubscriber.redisClient;
	}

	static async close(): Promise<void> {
		if (!RedisServiceSubscriber.redisClient) {
			return;
		}
		await RedisServiceSubscriber.redisClient.quit();
		RedisServiceSubscriber.redisClient = undefined;
	}

	async subscribe(channel: string): Promise<void> {
		if (!RedisServiceSubscriber.redisClient) {
			await this.init();
		}
		await RedisServiceSubscriber.redisClient?.subscribe(channel, (error, count: number) => {
			if (error) {
				Logger.error(`Error subscribing to channel ${channel}`);
			} else {
				Logger.debug(`Subscribed ${count.toString()} to eventlog channel`);
			}
		});
	}

	async subscribeToEventLog(): Promise<void> {
		await this.subscribe(EVENT_BUS_REDIS_CHANNEL);
	}

	async subscribeToCommandChannel(): Promise<void> {
		await this.subscribe(COMMAND_REDIS_CHANNEL);
	}

	addMessageHandler(handlerName: string, handler: MessageHandler): void {
		RedisServiceSubscriber.messageHandlers.set(handlerName, handler);
	}

	removeMessageHandler(handlerName: string): void {
		RedisServiceSubscriber.messageHandlers.delete(handlerName);
	}
}

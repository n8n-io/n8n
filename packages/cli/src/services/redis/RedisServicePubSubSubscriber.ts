import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
	getDefaultRedisClient,
} from './RedisServiceHelper';

type MessageHandler = (channel: string, message: string) => void;

@Service()
export class RedisServicePubSubSubscriber {
	static redisClient: Redis | Cluster | undefined;

	static messageHandlers: Map<string, MessageHandler> = new Map();

	static isInitialized = false;

	async init(): Promise<Redis | Cluster> {
		if (RedisServicePubSubSubscriber.redisClient && RedisServicePubSubSubscriber.isInitialized) {
			return RedisServicePubSubSubscriber.redisClient;
		}

		RedisServicePubSubSubscriber.redisClient = await getDefaultRedisClient();

		RedisServicePubSubSubscriber.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServicePubSubSubscriber.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		RedisServicePubSubSubscriber.redisClient.on('message', (channel: string, message: string) => {
			RedisServicePubSubSubscriber.messageHandlers.forEach((handler) => handler(channel, message));
		});

		return RedisServicePubSubSubscriber.redisClient;
	}

	static async close(): Promise<void> {
		if (!RedisServicePubSubSubscriber.redisClient) {
			return;
		}
		await RedisServicePubSubSubscriber.redisClient.quit();
		RedisServicePubSubSubscriber.redisClient = undefined;
	}

	async subscribe(channel: string): Promise<void> {
		if (!RedisServicePubSubSubscriber.redisClient) {
			await this.init();
		}
		await RedisServicePubSubSubscriber.redisClient?.subscribe(channel, (error, count: number) => {
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

	async subscribeToWorkerResponseChannel(): Promise<void> {
		await this.subscribe(WORKER_RESPONSE_REDIS_CHANNEL);
	}

	addMessageHandler(handlerName: string, handler: MessageHandler): void {
		RedisServicePubSubSubscriber.messageHandlers.set(handlerName, handler);
	}

	removeMessageHandler(handlerName: string): void {
		RedisServicePubSubSubscriber.messageHandlers.delete(handlerName);
	}
}

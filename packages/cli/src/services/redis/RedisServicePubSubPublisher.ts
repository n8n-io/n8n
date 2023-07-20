import type Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { AbstractEventMessage } from '@/eventbus/EventMessageClasses/AbstractEventMessage';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
	getDefaultRedisClient,
} from './RedisServiceHelper';
import type {
	RedisServiceCommandObject,
	RedisServiceWorkerResponseObject,
} from './RedisServiceCommands';

type MessageHandler = (channel: string, message: string) => void;

@Service()
export class RedisServicePubSubPublisher {
	static redisClient: Redis | Cluster | undefined;

	static messageHandlers: Map<string, MessageHandler> = new Map();

	static isInitialized = false;

	async init(): Promise<Redis | Cluster> {
		if (RedisServicePubSubPublisher.redisClient && RedisServicePubSubPublisher.isInitialized) {
			return RedisServicePubSubPublisher.redisClient;
		}
		RedisServicePubSubPublisher.redisClient = await getDefaultRedisClient();
		RedisServicePubSubPublisher.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServicePubSubPublisher.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		return RedisServicePubSubPublisher.redisClient;
	}

	static async close(): Promise<void> {
		if (!RedisServicePubSubPublisher.redisClient) {
			return;
		}
		await RedisServicePubSubPublisher.redisClient.quit();
		RedisServicePubSubPublisher.redisClient = undefined;
	}

	async publish(channel: string, message: string): Promise<void> {
		if (!RedisServicePubSubPublisher.redisClient) {
			await this.init();
		}
		await RedisServicePubSubPublisher.redisClient?.publish(channel, message);
	}

	async publishToEventLog(message: AbstractEventMessage): Promise<void> {
		await this.publish(EVENT_BUS_REDIS_CHANNEL, message.toString());
	}

	async publishToCommandChannel(message: RedisServiceCommandObject): Promise<void> {
		await this.publish(COMMAND_REDIS_CHANNEL, JSON.stringify(message));
	}

	async publishToWorkerChannel(message: RedisServiceWorkerResponseObject): Promise<void> {
		await this.publish(WORKER_RESPONSE_REDIS_CHANNEL, JSON.stringify(message));
	}
}

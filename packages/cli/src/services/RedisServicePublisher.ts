import type Redis from 'ioredis';
import { Service } from 'typedi';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { AbstractEventMessage } from '../eventbus/EventMessageClasses/AbstractEventMessage';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
	getRedisClient,
} from './RedisServiceHelper';
import type {
	RedisServiceCommandObject,
	RedisServiceWorkerResponseObject,
} from './RedisServiceCommands';

type MessageHandler = (channel: string, message: string) => void;

@Service()
export class RedisServicePublisher {
	static redisClient: Redis | undefined;

	static messageHandlers: Map<string, MessageHandler> = new Map();

	static isInitialized = false;

	async init(): Promise<Redis> {
		if (RedisServicePublisher.redisClient && RedisServicePublisher.isInitialized) {
			return RedisServicePublisher.redisClient;
		}
		RedisServicePublisher.redisClient = await getRedisClient();
		RedisServicePublisher.redisClient.on('close', () => {
			Logger.warn('Redis unavailable - trying to reconnect...');
		});

		RedisServicePublisher.redisClient.on('error', (error) => {
			if (!String(error).includes('ECONNREFUSED')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				Logger.warn('Error with Redis: ', error);
			}
		});

		return RedisServicePublisher.redisClient;
	}

	static async close(): Promise<void> {
		if (!RedisServicePublisher.redisClient) {
			return;
		}
		await RedisServicePublisher.redisClient.quit();
		RedisServicePublisher.redisClient = undefined;
	}

	async publish(channel: string, message: string): Promise<void> {
		if (!RedisServicePublisher.redisClient) {
			await this.init();
		}
		await RedisServicePublisher.redisClient?.publish(channel, message);
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

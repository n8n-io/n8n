import { Service } from 'typedi';
import type { AbstractEventMessage } from '@/eventbus/EventMessageClasses/AbstractEventMessage';
import {
	COMMAND_REDIS_CHANNEL,
	EVENT_BUS_REDIS_CHANNEL,
	WORKER_RESPONSE_REDIS_CHANNEL,
} from './RedisServiceHelper';
import type {
	RedisServiceCommandObject,
	RedisServiceWorkerResponseObject,
} from './RedisServiceCommands';
import { RedisServiceBaseSender } from './RedisServiceBaseClasses';

@Service()
export class RedisServicePubSubPublisher extends RedisServiceBaseSender {
	async init(): Promise<void> {
		await super.init('publisher');
	}

	async publish(channel: string, message: string): Promise<void> {
		if (!this.redisClient) {
			await this.init();
		}
		await this.redisClient?.publish(channel, message);
	}

	async publishToEventLog(message: AbstractEventMessage): Promise<void> {
		await this.publish(EVENT_BUS_REDIS_CHANNEL, message.toString());
	}

	async publishToCommandChannel(
		message: Omit<RedisServiceCommandObject, 'senderId'>,
	): Promise<void> {
		const messageWithSenderId = message as RedisServiceCommandObject;
		messageWithSenderId.senderId = this.senderId;
		await this.publish(COMMAND_REDIS_CHANNEL, JSON.stringify(messageWithSenderId));
	}

	async publishToWorkerChannel(message: RedisServiceWorkerResponseObject): Promise<void> {
		await this.publish(WORKER_RESPONSE_REDIS_CHANNEL, JSON.stringify(message));
	}

	async setIfNotExists(key: string, value: string) {
		if (!this.redisClient) await this.init();

		const success = await this.redisClient?.setnx(key, value);

		return !!success;
	}

	async setExpiration(key: string, ttl: number) {
		if (!this.redisClient) await this.init();

		await this.redisClient?.expire(key, ttl);
	}

	async get(key: string) {
		if (!this.redisClient) await this.init();

		return await this.redisClient?.get(key);
	}

	async clear(key: string) {
		if (!this.redisClient) await this.init();

		await this.redisClient?.del(key);
	}
}

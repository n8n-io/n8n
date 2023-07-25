import { Service } from 'typedi';
import { WORKER_RESPONSE_REDIS_LIST } from './RedisServiceHelper';
import type { RedisServiceWorkerResponseObject } from './RedisServiceCommands';
import { RedisServiceBaseSender } from './RedisServiceBaseClasses';

@Service()
export class RedisServiceListSender extends RedisServiceBaseSender {
	async init(senderId?: string): Promise<void> {
		await super.init('list-sender');
		this.setSenderId(senderId);
	}

	async pushToFront(list: string, message: string): Promise<void> {
		if (!this.redisClient) {
			await this.init();
		}
		await this.redisClient?.lpush(list, message);
	}

	async pushToBack(list: string, message: string): Promise<void> {
		if (!this.redisClient) {
			await this.init();
		}
		await this.redisClient?.rpush(list, message);
	}

	async appendWorkerResponse(message: RedisServiceWorkerResponseObject): Promise<void> {
		await this.pushToFront(WORKER_RESPONSE_REDIS_LIST, JSON.stringify(message));
	}
}

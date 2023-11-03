import { Service } from 'typedi';
import { jsonParse } from 'n8n-workflow';
import { WORKER_RESPONSE_REDIS_LIST } from './RedisServiceHelper';
import type { RedisServiceWorkerResponseObject } from './RedisServiceCommands';
import { RedisServiceBaseReceiver } from './RedisServiceBaseClasses';

@Service()
export class RedisServiceListReceiver extends RedisServiceBaseReceiver {
	async init(): Promise<void> {
		await super.init('list-receiver');
	}

	async popFromHead(list: string): Promise<string | null | undefined> {
		if (!this.redisClient) {
			await this.init();
		}
		return this.redisClient?.lpop(list);
	}

	async popFromTail(list: string): Promise<string | null | undefined> {
		if (!this.redisClient) {
			await this.init();
		}
		return this.redisClient?.rpop(list);
	}

	private poppedResultToWorkerResponse(
		poppedResult: string | null | undefined,
		list: string = WORKER_RESPONSE_REDIS_LIST,
	): RedisServiceWorkerResponseObject | null {
		if (poppedResult) {
			try {
				const workerResponse = jsonParse<RedisServiceWorkerResponseObject>(poppedResult);
				if (workerResponse) {
					// TODO: Handle worker response
					console.log('Received worker response', workerResponse);
				}
				return workerResponse;
			} catch (error) {
				this.logger.warn(
					`Error parsing worker response on list ${list}: ${(error as Error).message}`,
				);
			}
		}
		return null;
	}

	async popOldestWorkerResponse(): Promise<RedisServiceWorkerResponseObject | null> {
		const poppedResult = await this.popFromTail(WORKER_RESPONSE_REDIS_LIST);
		return this.poppedResultToWorkerResponse(poppedResult);
	}

	async popLatestWorkerResponse(): Promise<RedisServiceWorkerResponseObject | null> {
		const poppedResult = await this.popFromHead(WORKER_RESPONSE_REDIS_LIST);
		return this.poppedResultToWorkerResponse(poppedResult);
	}
}

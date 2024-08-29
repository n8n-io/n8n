import Container from 'typedi';
import { RedisService } from './redis.service';
import type { RedisServicePubSubSubscriber } from './redis/redis-service-pub-sub-subscriber';
import type { WorkerCommandReceivedHandlerOptions } from './orchestration/worker/types';
import type { MainResponseReceivedHandlerOptions } from './orchestration/main/types';

export abstract class OrchestrationHandlerService {
	protected initialized = false;

	redisSubscriber: RedisServicePubSubSubscriber;

	readonly redisService: RedisService;

	constructor() {
		this.redisService = Container.get(RedisService);
	}

	async init() {
		await this.initSubscriber();
		this.initialized = true;
	}

	async initWithOptions(
		options: WorkerCommandReceivedHandlerOptions | MainResponseReceivedHandlerOptions,
	) {
		await this.initSubscriber(options);
		this.initialized = true;
	}

	async shutdown() {
		await this.redisSubscriber?.destroy();
		this.initialized = false;
	}

	protected abstract initSubscriber(
		options?: WorkerCommandReceivedHandlerOptions | MainResponseReceivedHandlerOptions,
	): Promise<void>;
}

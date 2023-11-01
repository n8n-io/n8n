import Container from 'typedi';
import { RedisService } from './redis.service';
import type { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';
import config from '@/config';

export abstract class OrchestrationService {
	protected initialized = false;

	protected queueModeId: string;

	redisPublisher: RedisServicePubSubPublisher;

	readonly redisService: RedisService;

	get isQueueMode(): boolean {
		return config.get('executions.mode') === 'queue';
	}

	get isMainInstance(): boolean {
		return config.get('generic.instanceType') === 'main';
	}

	get isWebhookInstance(): boolean {
		return config.get('generic.instanceType') === 'webhook';
	}

	get isWorkerInstance(): boolean {
		return config.get('generic.instanceType') === 'worker';
	}

	constructor() {
		this.redisService = Container.get(RedisService);
		this.queueModeId = config.getEnv('redis.queueModeId');
	}

	sanityCheck(): boolean {
		return this.initialized && this.isQueueMode;
	}

	async init() {
		await this.initPublisher();
		this.initialized = true;
	}

	async shutdown() {
		await this.redisPublisher?.destroy();
		this.initialized = false;
	}

	protected async initPublisher() {
		this.redisPublisher = await this.redisService.getPubSubPublisher();
	}
}

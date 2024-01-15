import Container from 'typedi';
import { RedisService } from './redis.service';
import type { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';
import config from '@/config';
import { EventEmitter } from 'node:events';

export abstract class OrchestrationService extends EventEmitter {
	protected isInitialized = false;

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
		super();
		this.redisService = Container.get(RedisService);
		this.queueModeId = config.getEnv('redis.queueModeId');
	}

	sanityCheck(): boolean {
		return this.isInitialized && this.isQueueMode;
	}

	async init() {
		await this.initPublisher();
		this.isInitialized = true;
	}

	async shutdown() {
		await this.redisPublisher?.destroy();
		this.isInitialized = false;
	}

	protected async initPublisher() {
		this.redisPublisher = await this.redisService.getPubSubPublisher();
	}
}

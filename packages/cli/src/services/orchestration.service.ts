import { Service } from 'typedi';
import { RedisService } from './redis.service';
import type { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';
import config from '@/config';

@Service()
export class OrchestrationService {
	private initialized = false;

	redisPublisher: RedisServicePubSubPublisher;

	get isQueueMode() {
		return config.getEnv('executions.mode') === 'queue';
	}

	constructor(readonly redisService: RedisService) {}

	async init() {
		await this.initPublisher();
		this.initialized = true;
	}

	async shutdown() {
		await this.redisPublisher?.destroy();
	}

	private async initPublisher() {
		this.redisPublisher = await this.redisService.getPubSubPublisher();
	}

	async getWorkerStatus(id?: string) {
		if (!this.isQueueMode) {
			return;
		}
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			command: 'getStatus',
			targets: id ? [id] : undefined,
		});
	}

	async getWorkerIds() {
		if (!this.isQueueMode) {
			return;
		}
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			command: 'getId',
		});
	}

	async broadcastRestartEventbusAfterDestinationUpdate() {
		if (!this.isQueueMode) {
			return;
		}
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			command: 'restartEventBus',
		});
	}

	async broadcastReloadExternalSecretsProviders() {
		if (!this.isQueueMode) {
			return;
		}
		if (!this.initialized) {
			throw new Error('OrchestrationService not initialized');
		}
		await this.redisPublisher.publishToCommandChannel({
			command: 'reloadExternalSecretsProviders',
		});
	}
}

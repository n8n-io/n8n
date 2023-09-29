import { Service } from 'typedi';
import { OrchestrationService } from '../../orchestration.base.service';

@Service()
export class OrchestrationWebhookService extends OrchestrationService {
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

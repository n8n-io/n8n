import { Service } from 'typedi';
import { OrchestrationService } from '../../orchestration.base.service';

@Service()
export class OrchestrationMainService extends OrchestrationService {
	sanityCheck(): boolean {
		return this.initialized && this.isQueueMode && this.isMainInstance;
	}

	async getWorkerStatus(id?: string) {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'getStatus',
			targets: id ? [id] : undefined,
		});
	}

	async getWorkerIds() {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'getId',
		});
	}

	async broadcastRestartEventbusAfterDestinationUpdate() {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'restartEventBus',
		});
	}

	async broadcastReloadExternalSecretsProviders() {
		if (!this.sanityCheck()) return;
		await this.redisPublisher.publishToCommandChannel({
			command: 'reloadExternalSecretsProviders',
		});
	}
}

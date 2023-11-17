import { Logger } from '@/Logger';
import { Service } from 'typedi';
import { OrchestrationService } from '@/services/orchestration.base.service';

/**
 * For use in main instance, in single main instance scenario.
 */
@Service()
export class SingleMainSetup extends OrchestrationService {
	constructor(protected readonly logger: Logger) {
		super();
	}

	sanityCheck() {
		return this.isInitialized && this.isQueueMode && this.isMainInstance;
	}

	async getWorkerStatus(id?: string) {
		if (!this.sanityCheck()) return;

		const command = 'getStatus';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({
			command,
			targets: id ? [id] : undefined,
		});
	}

	async getWorkerIds() {
		if (!this.sanityCheck()) return;

		const command = 'getId';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({ command });
	}

	async broadcastRestartEventbusAfterDestinationUpdate() {
		if (!this.sanityCheck()) return;

		const command = 'restartEventBus';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({ command });
	}

	async broadcastReloadExternalSecretsProviders() {
		if (!this.sanityCheck()) return;

		const command = 'reloadExternalSecretsProviders';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({ command });
	}
}

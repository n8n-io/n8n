import { Logger } from '@/Logger';
import { Service } from 'typedi';
import { OrchestrationService } from '../../orchestration.base.service';
import { SanityCheck } from './main-instance-sanity-check.decorator';

/**
 * Publishes to command channel. For use in main instance only.
 */
@Service()
export class MainInstancePublisher extends OrchestrationService {
	constructor(protected readonly logger: Logger) {
		super();
	}

	sanityCheck() {
		return this.initialized && this.isQueueMode && this.isMainInstance;
	}

	@SanityCheck()
	async getWorkerStatus(id?: string) {
		this.logger.debug('Sending "getStatus" to command channel');

		await this.redisPublisher.publishToCommandChannel({
			command: 'getStatus',
			targets: id ? [id] : undefined,
		});
	}

	@SanityCheck()
	async getWorkerIds() {
		const command = 'getId';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({ command });
	}

	@SanityCheck()
	async broadcastRestartEventbusAfterDestinationUpdate() {
		const command = 'restartEventBus';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({ command });
	}

	@SanityCheck()
	async broadcastReloadExternalSecretsProviders() {
		const command = 'reloadExternalSecretsProviders';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({ command });
	}
}

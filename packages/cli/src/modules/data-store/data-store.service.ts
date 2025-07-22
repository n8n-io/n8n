import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { DataStoreConfig } from './data-store';
import { DataStoreRepository } from './data-store.repository';

@Service()
export class DataStoreService {
	private intervalId?: NodeJS.Timeout;

	constructor(
		private readonly dataStoreRepository: DataStoreRepository,
		private readonly logger: Logger,
		private readonly config: DataStoreConfig,
	) {
		this.logger = this.logger.scoped('data-store');
	}

	start() {
		this.logger.debug('Starting feature work...');

		this.intervalId = setInterval(
			() => {
				this.logger.debug('Running scheduled task...');
			},
			this.config.taskInterval * 60 * 1000,
		);
	}

	async shutdown() {
		this.logger.debug('Shutting down...');

		if (this.intervalId) {
			clearInterval(this.intervalId);
		}

		await Promise.resolve();
	}

	async getSummary() {
		return await this.dataStoreRepository.getSummary();
	}
}

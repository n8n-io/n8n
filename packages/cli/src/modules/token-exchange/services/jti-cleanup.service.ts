import { Logger } from '@n8n/backend-common';
import { TokenExchangeConfig } from '../token-exchange.config';
import { Time } from '@n8n/constants';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { TokenExchangeJtiRepository } from '../database/repositories/token-exchange-jti.repository';

@Service()
export class JtiCleanupService {
	private cleanupInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly config: TokenExchangeConfig,
		private readonly jtiRepository: TokenExchangeJtiRepository,
	) {
		this.logger = logger.scoped('token-exchange');
	}

	startCleanup() {
		if (this.isShuttingDown) return;

		const intervalMs = this.config.jtiCleanupIntervalSeconds * Time.seconds.toMilliseconds;
		this.cleanupInterval = setInterval(async () => await this.cleanup(), intervalMs);

		this.logger.debug(`JTI cleanup scheduled every ${this.config.jtiCleanupIntervalSeconds}s`);
	}

	private async cleanup() {
		let totalDeleted = 0;
		try {
			let deleted: number;
			do {
				deleted = await this.jtiRepository.deleteExpiredBatch(this.config.jtiCleanupBatchSize);
				totalDeleted += deleted;
			} while (deleted >= this.config.jtiCleanupBatchSize);

			if (totalDeleted > 0) {
				this.logger.debug('Cleaned up expired JTIs', { count: totalDeleted });
			}
		} catch (error) {
			this.logger.error('Failed to clean up expired JTIs', { error });
		}
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		clearInterval(this.cleanupInterval);
	}
}

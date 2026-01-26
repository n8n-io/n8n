import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

/**
 * Loads providers connections from the database and caches them in memory
 */
@Service()
export class SecretsProviderConnectionStoreCache {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('external-secrets');
	}
}

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ExternalSecretsProviders } from './external-secrets-providers.ee';
import { ExternalSecretsConfig } from './external-secrets.config';
import { ExternalSecretsProviderLifecycle } from './provider-lifecycle.service';
import { ExternalSecretsProviderRegistry } from './provider-registry.service';
import { ExternalSecretsRetryManager } from './retry-manager.service';
import { ExternalSecretsSecretsCache } from './secrets-cache.service';

@Service()
export class SecretsCacheRefresh {
	initialized = false;
	constructor(
		private readonly logger: Logger,
		private readonly config: ExternalSecretsConfig,
		private readonly providersFactory: ExternalSecretsProviders,
		private readonly providerRegistry: ExternalSecretsProviderRegistry,
		private readonly providerLifecycle: ExternalSecretsProviderLifecycle,
		private readonly retryManager: ExternalSecretsRetryManager,
		private readonly secretsCache: ExternalSecretsSecretsCache,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(): Promise<void> {
		if (this.initialized) {
			this.logger.debug('Secrets cache refresh already initialized');
			return;
		}

		// TODO: Implement
	}

	shutdown(): void {
		// TODO: Implement

		this.initialized = false;
		this.logger.debug('External secrets manager shut down');
	}
}

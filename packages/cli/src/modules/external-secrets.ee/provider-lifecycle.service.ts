import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

import { ExternalSecretsProviders } from './external-secrets-providers.ee';
import type { SecretsProvider, SecretsProviderSettings } from './types';

interface ProviderInitResult {
	success: boolean;
	provider?: SecretsProvider;
	error?: Error;
}

export interface ProviderConnectResult {
	success: boolean;
	error?: Error;
}

/**
 * Handles provider initialization and connection lifecycle
 * Separates validation from connection logic
 */
@Service()
export class ExternalSecretsProviderLifecycle {
	constructor(
		private readonly logger: Logger,
		private readonly providersFactory: ExternalSecretsProviders,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	/**
	 * Initialize a provider with settings validation
	 * Does not connect - that's a separate step
	 */
	async initialize(name: string, settings: SecretsProviderSettings): Promise<ProviderInitResult> {
		// Create provider instance
		const providerClass = this.providersFactory.getProvider(name);
		if (!providerClass) {
			return {
				success: false,
				error: new Error(`Provider class not found: ${name}`),
			};
		}

		const provider = new providerClass();

		// Validate settings
		try {
			this.logger.debug(`Initializing secrets provider ${provider.displayName} (${name})`);
			await provider.init(settings);
			provider.setState('initialized');

			return {
				success: true,
				provider,
			};
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(
				`Validation error initializing secrets provider ${provider.displayName} (${name})`,
				{ error },
			);
			provider.setState('error', error);

			return {
				success: false,
				provider, // Return provider in error state for diagnostics
				error,
			};
		}
	}

	/**
	 * Connect a provider (network operation)
	 * Provider manages its own state during connection
	 */
	async connect(provider: SecretsProvider): Promise<ProviderConnectResult> {
		try {
			this.logger.debug(`Connecting secrets provider ${provider.displayName} (${provider.name})`);

			provider.setState('connecting');
			await provider.connect();

			if (provider.state === 'error') {
				return {
					success: false,
					error: new Error('Provider entered error state during connection'),
				};
			}

			this.logger.debug(`Successfully connected secrets provider ${provider.displayName}`);
			return { success: true };
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(
				`Connection error for secrets provider ${provider.displayName} (${provider.name})`,
				{ error },
			);
			provider.setState('error', error);

			return {
				success: false,
				error,
			};
		}
	}

	/**
	 * Disconnect a provider gracefully
	 */
	async disconnect(provider: SecretsProvider): Promise<void> {
		try {
			await provider.disconnect();
			provider.setState('initializing');
			this.logger.debug(`Disconnected secrets provider ${provider.displayName}`);
		} catch (error) {
			this.logger.warn(`Error disconnecting provider ${provider.displayName}`, {
				error: ensureError(error),
			});
		}
	}

	/**
	 * Reload a provider (disconnect + reinitialize + reconnect)
	 */
	async reload(
		provider: SecretsProvider,
		settings: SecretsProviderSettings,
	): Promise<ProviderInitResult> {
		await this.disconnect(provider);
		return await this.initialize(provider.name, settings);
	}
}

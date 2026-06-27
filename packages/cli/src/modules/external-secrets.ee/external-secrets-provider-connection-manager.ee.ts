import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import {
	ExternalSecretsProviderLifecycle,
	type ProviderConnectResult,
} from './provider-lifecycle.service';
import { ExternalSecretsProviderRegistry } from './provider-registry.service';
import { ExternalSecretsRetryManager } from './retry-manager.service';
import type { SecretsProvider, SecretsProviderSettings } from './types';

@Service()
export class ExternalSecretsProviderConnectionManager {
	constructor(
		private readonly logger: Logger,
		private readonly providerRegistry: ExternalSecretsProviderRegistry,
		private readonly providerLifecycle: ExternalSecretsProviderLifecycle,
		private readonly retryManager: ExternalSecretsRetryManager,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async upsertProviderConnection(
		providerKey: string,
		providerType: string,
		config: SecretsProviderSettings,
	): Promise<void> {
		if (this.providerRegistry.has(providerKey)) {
			// When there is already a provider registered we want to prepare the replacement before swapping the registry.
			// We tolerate a small time window where we keep the old provider while the new one is being prepared.
			// This is important because this avoids executions failing intermittently during the reload phase.
			await this.replaceProviderConnection(providerKey, providerType, config);
			return;
		}

		await this.addProviderConnection(providerKey, providerType, config);
	}

	async removeProviderConnection(providerKey: string): Promise<void> {
		// cancelling retries is needed because we can have previous connections for the same provider key
		// This is especially common during the setup phase when initial configurations might be wrong
		// and there will be several changes to the configuration before settling for a valid one.
		this.retryManager.cancelRetry(providerKey);

		this.logger.debug('Removing external secrets provider connection', {
			providerKey,
		});

		const existingProvider = this.providerRegistry.get(providerKey);
		if (existingProvider) {
			await this.providerLifecycle.disconnect(existingProvider);
			this.providerRegistry.remove(providerKey);
		}
	}

	async connectProviderWithRetry(providerKey: string): Promise<ProviderConnectResult> {
		return await this.retryManager.runWithRetry(
			providerKey,
			async () => await this.connectProvider(providerKey),
		);
	}

	async disconnectProvider(providerKey: string): Promise<void> {
		this.retryManager.cancelRetry(providerKey);

		const provider = this.providerRegistry.get(providerKey);
		if (provider) {
			await this.providerLifecycle.disconnect(provider);
		}
	}

	private async addProviderConnection(
		providerKey: string,
		providerType: string,
		config: SecretsProviderSettings,
	): Promise<void> {
		this.logger.debug('Adding external secrets provider connection', {
			providerKey,
			providerType,
		});

		const result = await this.providerLifecycle.initialize(providerType, config);

		if (!result.success || !result.provider) {
			this.logger.error('Failed to initialize external secrets provider connection', {
				providerKey,
				providerType,
				error: result.error,
			});
			return;
		}

		this.providerRegistry.set(providerKey, result.provider);

		if (config.connected) {
			await this.connectProviderWithRetry(providerKey);
		}
	}

	private async replaceProviderConnection(
		providerKey: string,
		providerType: string,
		config: SecretsProviderSettings,
	): Promise<void> {
		this.logger.debug('Replacing external secrets provider connection', {
			providerKey,
			providerType,
		});

		// Initialization validates local config, so retrying it would only repeat deterministic failures.
		const initResult = await this.providerLifecycle.initialize(providerType, config);

		if (!initResult.success || !initResult.provider) {
			const error =
				initResult.error ?? new UnexpectedError(`Failed to initialize provider ${providerKey}`);
			this.logger.error('Failed to initialize replacement external secrets provider connection', {
				providerKey,
				providerType,
				error,
			});
			await this.removeProviderConnection(providerKey);
			return;
		}

		const replacementProvider = initResult.provider;
		if (config.connected) {
			// Only connection is retried. A successful retry must also perform the registry swap.
			const replacementResult = await this.retryManager.runWithRetry(
				providerKey,
				async () =>
					await this.connectAndSwapProviderConnection(
						providerKey,
						providerType,
						replacementProvider,
					),
			);

			if (!replacementResult.success) {
				// The replacement reflects the latest config, even if connection failed. Register it
				// in its error state so executions fail visibly instead of using stale secrets.
				await this.swapProviderConnection(providerKey, providerType, replacementProvider);
			}
		} else {
			await this.swapProviderConnection(providerKey, providerType, replacementProvider);
		}
	}

	private async connectAndSwapProviderConnection(
		providerKey: string,
		providerType: string,
		replacementProvider: SecretsProvider,
	): Promise<ProviderConnectResult> {
		const connectResult = await this.providerLifecycle.connect(replacementProvider);
		if (!connectResult.success) {
			this.logger.error('Failed to connect replacement external secrets provider connection', {
				providerKey,
				providerType,
				error: connectResult.error,
			});
			return connectResult;
		}

		return await this.swapProviderConnection(providerKey, providerType, replacementProvider);
	}

	private async swapProviderConnection(
		providerKey: string,
		providerType: string,
		replacementProvider: SecretsProvider,
	): Promise<ProviderConnectResult> {
		const existingProvider = this.providerRegistry.get(providerKey);

		this.providerRegistry.set(providerKey, replacementProvider);

		if (existingProvider && existingProvider !== replacementProvider) {
			this.logger.debug('Disconnecting previous external secrets provider connection', {
				providerKey,
				providerType,
			});
			await this.providerLifecycle.disconnect(existingProvider);
		}

		return { success: true };
	}

	private async connectProvider(providerKey: string): Promise<ProviderConnectResult> {
		const provider = this.providerRegistry.get(providerKey);
		if (!provider) {
			this.logger.warn(`Cannot connect provider ${providerKey}: not found in registry`);
			throw new Error(`Provider ${providerKey} not found in registry`);
		}

		return await this.providerLifecycle.connect(provider);
	}
}

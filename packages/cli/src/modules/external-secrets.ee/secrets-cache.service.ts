import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError, OperationalError } from 'n8n-workflow';

import { EXTERNAL_SECRETS_REFRESH_TIMEOUT_MS } from './constants';
import { ExternalSecretsProviderRegistry } from './provider-registry.service';
import type { SecretsProvider } from './types';

/**
 * Manages secrets caching and refresh from providers
 * Delegates actual secret storage to providers
 */
@Service()
export class ExternalSecretsSecretsCache {
	constructor(
		private readonly logger: Logger,
		private readonly registry: ExternalSecretsProviderRegistry,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	/**
	 * Refresh secrets from all connected providers
	 */
	async refreshAll(): Promise<void> {
		const providers = this.registry.getAll();
		await Promise.allSettled(
			Array.from(providers.entries()).map(
				async ([name, provider]) => await this.refreshProvider(name, provider),
			),
		);
		this.logger.debug('Refreshed secrets from all providers');
	}

	/**
	 * Refresh secrets from a specific provider
	 */
	async refreshProvider(name: string, provider: SecretsProvider): Promise<void> {
		// Only refresh connected providers
		if (provider.state !== 'connected') {
			return;
		}

		try {
			await this.refreshProviderWithTimeout(provider);
			this.logger.debug(`Refreshed secrets from provider ${name}`);
		} catch (error) {
			this.logger.error(`Error refreshing secrets from provider ${name}`, {
				error: ensureError(error),
			});
		}
	}

	private async refreshProviderWithTimeout(provider: SecretsProvider): Promise<void> {
		let timeoutId: NodeJS.Timeout | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(
					new OperationalError(
						`Timed out refreshing secrets after ${EXTERNAL_SECRETS_REFRESH_TIMEOUT_MS}ms`,
					),
				);
			}, EXTERNAL_SECRETS_REFRESH_TIMEOUT_MS);
		});

		try {
			await Promise.race([provider.update(), timeoutPromise]);
		} finally {
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}
		}
	}

	/**
	 * Get a secret from a specific provider
	 */
	getSecret(providerName: string, secretName: string): unknown {
		const provider = this.registry.get(providerName);
		return provider?.getSecret(secretName);
	}

	/**
	 * Check if a provider has a specific secret
	 */
	hasSecret(providerName: string, secretName: string): boolean {
		const provider = this.registry.get(providerName);
		return provider?.hasSecret(secretName) ?? false;
	}

	/**
	 * Get all secret names from a provider
	 */
	getSecretNames(providerName: string): string[] {
		const provider = this.registry.get(providerName);
		return provider?.getSecretNames() ?? [];
	}

	/**
	 * Get all secrets from all providers
	 */
	getAllSecretNames(): Record<string, string[]> {
		const providers = this.registry.getAll();
		const result: Record<string, string[]> = {};

		for (const [name, provider] of providers.entries()) {
			result[name] = provider.getSecretNames();
		}

		return result;
	}
}

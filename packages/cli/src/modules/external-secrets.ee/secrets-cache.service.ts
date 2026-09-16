import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { ExternalSecretsConfig } from './external-secrets.config';
import { ExternalSecretsProviderRegistry } from './provider-registry.service';
import type { SecretsProvider } from './types';
import { TimeoutError, withTimeout } from './with-timeout';

/**
 * Manages secrets caching and refresh from providers
 * Delegates actual secret storage to providers
 */
@Service()
export class ExternalSecretsSecretsCache {
	// Weak, so a pull that never settles does not keep a removed provider reachable.
	private readonly inFlight = new WeakMap<SecretsProvider, Promise<void>>();

	constructor(
		private readonly logger: Logger,
		private readonly registry: ExternalSecretsProviderRegistry,
		private readonly config: ExternalSecretsConfig,
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
			await this.updateProvider(name, provider);
		} catch (error) {
			if (error instanceof TimeoutError) {
				this.logger.warn(`Secrets refresh for provider ${name} is still running`, {
					error,
				});
				return;
			}
			this.logger.error(`Error refreshing secrets from provider ${name}`, {
				error: ensureError(error),
			});
		}
	}

	/**
	 * Pulls a provider's secrets, bounded by the refresh timeout. Throws on failure. A caller that
	 * arrives while a pull is running joins it, so a timed-out pull and its retry never stack.
	 * Keyed by instance: a replacement under the same name must not join its predecessor's pull.
	 */
	async updateProvider(name: string, provider: SecretsProvider): Promise<void> {
		let pull = this.inFlight.get(provider);
		if (!pull) {
			pull = provider.update().finally(() => this.inFlight.delete(provider));
			pull.catch(() => {}); // Rejections reach the awaiting callers; none is left unhandled.
			this.inFlight.set(provider, pull);
		}

		const timeoutMs = this.config.refreshTimeout * Time.seconds.toMilliseconds;
		await withTimeout(pull, timeoutMs, `Timed out refreshing secrets after ${timeoutMs}ms`);
		this.logger.debug(`Refreshed secrets from provider ${name}`);
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

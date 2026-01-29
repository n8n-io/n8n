import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { SecretsProviderConnection, SecretsProviderConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import { ExternalSecretsConfig } from './external-secrets.config';
import { ExternalSecretsProviderLifecycle } from './provider-lifecycle.service';
import { ExternalSecretsProviderRegistry } from './provider-registry.service';
import { ExternalSecretsRetryManager } from './retry-manager.service';
import { ExternalSecretsSecretsCache } from './secrets-cache.service';
import { ExternalSecretsSettingsStore } from './settings-store.service';
import { SecretsProviderSettings } from './types';

@Service()
export class SecretsCacheRefresh {
	initialized = false;
	private refreshInterval?: NodeJS.Timeout;
	private initializingPromise?: Promise<void>;

	constructor(
		private readonly logger: Logger,
		private readonly config: ExternalSecretsConfig,
		private readonly cipher: Cipher,
		private readonly providerRegistry: ExternalSecretsProviderRegistry,
		private readonly providerLifecycle: ExternalSecretsProviderLifecycle,
		private readonly settingsStore: ExternalSecretsSettingsStore,
		private readonly retryManager: ExternalSecretsRetryManager,
		private readonly secretsCache: ExternalSecretsSecretsCache,
		private readonly secretsProviderConnectionRepository: SecretsProviderConnectionRepository,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(): Promise<void> {
		if (this.initialized) {
			this.logger.debug('Secrets cache refresh already initialized');
			return;
		}

		this.initializingPromise ??= (async () => {
			try {
				if (this.config.externalSecretsForProjects) {
					this.logger.debug('Initializing external secrets with project-based providers');
					const connections = await this.secretsProviderConnectionRepository.findAll();

					for (const connection of connections) {
						await this.tearDownProviderConnection(connection.providerKey);
						await this.setupProviderConnection(connection);
					}
				} else {
					this.logger.debug('Initializing external secrets with legacy settings');
					const newSettings = await this.settingsStore.reload();

					// Reload/add providers from legacy settings
					for (const [name, providerSettings] of Object.entries(newSettings)) {
						await this.tearDownProviderConnection(name);

						await this.setupProvider({
							providerType: name,
							providerKey: name,
							settings: providerSettings,
						});
					}
				}

				await this.secretsCache.refreshAll();
				this.startRefreshInterval();

				this.initialized = true;
				this.logger.debug('External secrets manager initialized');
			} catch (error) {
				this.logger.error('External secrets manager failed to initialize', { error });
				throw error;
			} finally {
				this.initializingPromise = undefined;
			}
		})();

		await this.initializingPromise;
	}

	shutdown(): void {
		this.stopRefreshInterval();
		this.retryManager.cancelAll();
		void this.providerRegistry.disconnectAll();
		this.initialized = false;
		this.logger.debug('External secrets manager shut down');
	}

	private startRefreshInterval(): void {
		this.refreshInterval = setInterval(
			async () => await this.secretsCache.refreshAll(),
			this.config.updateInterval * Time.seconds.toMilliseconds,
		);
		this.logger.debug('Started secrets refresh interval');
	}

	private stopRefreshInterval(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = undefined;
			this.logger.debug('Stopped secrets refresh interval');
		}
	}

	private async tearDownProviderConnection(providerKey: string): Promise<void> {
		this.retryManager.cancelRetry(providerKey);
		const existingProvider = this.providerRegistry.get(providerKey);
		if (existingProvider) {
			this.logger.debug(`Tearing down provider connection: ${providerKey}`);
			await this.providerLifecycle.disconnect(existingProvider);
			this.providerRegistry.remove(providerKey);
		}
	}

	private async setupProviderConnection(connection: SecretsProviderConnection): Promise<void> {
		const settings: SecretsProviderSettings['settings'] = this.decryptSettings(
			connection.encryptedSettings,
		);

		const connectionSettings: SecretsProviderSettings = {
			connected: connection.isEnabled,
			connectedAt: null,
			settings,
		};

		await this.setupProvider({
			providerType: connection.type,
			providerKey: connection.providerKey,
			settings: connectionSettings,
		});
	}

	private async setupProvider({
		providerType,
		providerKey,
		settings,
	}: {
		providerType: string;
		providerKey: string;
		settings: SecretsProviderSettings;
	}): Promise<void> {
		const result = await this.providerLifecycle.initialize(providerType, settings);

		if (!result.success || !result.provider) {
			this.logger.error(`Failed to initialize provider ${providerKey}`, {
				error: result.error,
			});
			return;
		}

		this.providerRegistry.add(providerKey, result.provider);
		this.logger.debug(`Provider registered: ${providerKey}`);

		if (settings.connected) {
			await this.retryManager.runWithRetry(
				providerKey,
				async () => await this.providerLifecycle.connect(result.provider!),
			);
		}
	}

	private decryptSettings(encryptedData: string): SecretsProviderSettings['settings'] {
		const decryptedData = this.cipher.decrypt(encryptedData);

		try {
			return jsonParse<SecretsProviderSettings['settings']>(decryptedData);
		} catch (e) {
			this.logger.error('Failed to decrypt external secrets settings', { error: e });
			throw new UnexpectedError(
				'External Secrets Settings could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}
}

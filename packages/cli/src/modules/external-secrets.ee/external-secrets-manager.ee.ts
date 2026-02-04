import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { SecretsProviderConnectionRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { Cipher, type IExternalSecretsManager } from 'n8n-core';
import { jsonParse, UnexpectedError, type IDataObject } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { ExternalSecretsProviders } from './external-secrets-providers.ee';
import { ExternalSecretsConfig } from './external-secrets.config';
import {
	ExternalSecretsProviderLifecycle,
	ProviderConnectResult,
} from './provider-lifecycle.service';
import { ExternalSecretsProviderRegistry } from './provider-registry.service';
import { ExternalSecretsRetryManager } from './retry-manager.service';
import { ExternalSecretsSecretsCache } from './secrets-cache.service';
import { ExternalSecretsSettingsStore } from './settings-store.service';
import type { ExternalSecretsSettings, SecretsProvider, SecretsProviderSettings } from './types';

/**
 * Orchestrates external secrets management
 * Delegates to specialized components for clean separation of concerns
 */
@Service()
export class ExternalSecretsManager implements IExternalSecretsManager {
	initialized = false;

	private refreshInterval?: NodeJS.Timeout;

	private initializingPromise?: Promise<void>;

	constructor(
		private readonly logger: Logger,
		private readonly config: ExternalSecretsConfig,
		private readonly providersFactory: ExternalSecretsProviders,
		private readonly eventService: EventService,
		private readonly publisher: Publisher,
		private readonly settingsStore: ExternalSecretsSettingsStore,
		private readonly providerRegistry: ExternalSecretsProviderRegistry,
		private readonly providerLifecycle: ExternalSecretsProviderLifecycle,
		private readonly retryManager: ExternalSecretsRetryManager,
		private readonly secretsCache: ExternalSecretsSecretsCache,
		private readonly secretsProviderConnectionRepository: SecretsProviderConnectionRepository,
		private readonly cipher: Cipher,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	// ========================================
	// Lifecycle
	// ========================================

	async init(): Promise<void> {
		if (this.initialized) return;

		this.initializingPromise ??= (async () => {
			try {
				await this.reloadAllProviders();

				// Start periodic secrets refresh
				this.startSecretsRefresh();

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
		this.stopSecretsRefresh();
		this.retryManager.cancelAll();
		void this.providerRegistry.disconnectAll();
		this.initialized = false;
		this.logger.debug('External secrets manager shut down');
	}

	// ========================================
	// Public API - Providers
	// ========================================

	getProvider(provider: string): SecretsProvider | undefined {
		return this.providerRegistry.get(provider);
	}

	hasProvider(provider: string): boolean {
		return this.providerRegistry.has(provider);
	}

	getProviderNames(): string[] {
		return this.providerRegistry.getNames();
	}

	getProvidersWithSettings(): Array<{
		provider: SecretsProvider;
		settings: SecretsProviderSettings;
	}> {
		const allProviderClasses = this.providersFactory.getAllProviders();
		const settings = this.getCachedSettings();

		return Object.entries(allProviderClasses).map(([name, providerClass]) => ({
			provider: this.providerRegistry.get(name) ?? new providerClass(),
			settings: settings[name] ?? {},
		}));
	}

	getProviderWithSettings(provider: string): {
		provider: SecretsProvider;
		settings: SecretsProviderSettings;
	} {
		const ProviderClass = this.providersFactory.getProvider(provider);
		const settings = this.getCachedSettings();

		return {
			provider: this.providerRegistry.get(provider) ?? new ProviderClass(),
			settings: settings[provider] ?? {},
		};
	}

	async updateProvider(provider: string): Promise<void> {
		const providerInstance = this.providerRegistry.get(provider);

		if (!providerInstance) {
			throw new NotFoundError(`Provider "${provider}" not found`);
		}

		if (providerInstance.state !== 'connected') {
			throw new UnexpectedError(`Provider "${provider}" is not connected`);
		}

		await providerInstance.update();
		this.broadcastReload();
		this.logger.debug(`Updated provider ${provider}`);

		this.eventService.emit('external-secrets-provider-reloaded', {
			vaultType: provider,
		});
	}

	// ========================================
	// Public API - Secrets
	// ========================================

	getSecret(provider: string, name: string): unknown {
		return this.secretsCache.getSecret(provider, name);
	}

	hasSecret(provider: string, name: string): boolean {
		return this.secretsCache.hasSecret(provider, name);
	}

	getSecretNames(provider: string): string[] {
		return this.secretsCache.getSecretNames(provider);
	}

	getAllSecretNames(): Record<string, string[]> {
		return this.secretsCache.getAllSecretNames();
	}

	// ========================================
	// Public API - Settings
	// ========================================

	async setProviderSettings(
		provider: string,
		settings: IDataObject,
		userId?: string,
	): Promise<void> {
		const { isNewProvider } = await this.settingsStore.updateProvider(provider, { settings });
		await this.reloadProvider(provider);
		this.broadcastReload();
		void this.trackProviderSave(provider, isNewProvider, userId);
	}

	async setProviderConnected(provider: string, connected: boolean): Promise<void> {
		await this.settingsStore.updateProvider(provider, { connected });

		if (connected) {
			await this.retryManager.runWithRetry(
				provider,
				async () => await this.connectProvider(provider),
			);
		} else {
			// Cancel any pending retries when disconnecting
			this.retryManager.cancelRetry(provider);

			const providerInstance = this.providerRegistry.get(provider);
			if (providerInstance) {
				await this.providerLifecycle.disconnect(providerInstance);
			}
		}

		this.broadcastReload();
	}

	async testProviderSettings(provider: string, data: IDataObject) {
		const testSettings: SecretsProviderSettings = {
			connected: true,
			connectedAt: new Date(),
			settings: data,
		};

		const errorState = {
			success: false,
			testState: 'error' as const,
		};

		const result = await this.providerLifecycle.initialize(provider, testSettings);

		if (!result.success || !result.provider) {
			return errorState;
		}

		try {
			// Connect the provider to authenticate before testing
			const connectResult = await this.providerLifecycle.connect(result.provider);
			if (!connectResult.success) {
				return { ...errorState, error: connectResult.error?.message };
			}

			const [success, error] = await result.provider.test();
			const currentSettings = await this.settingsStore.getProvider(provider);
			const testState = this.determineTestState(success, currentSettings?.connected ?? false);

			return { success, testState, error };
		} catch {
			return errorState;
		} finally {
			await result.provider?.disconnect();
		}
	}

	// ========================================
	// Event Handlers
	// ========================================

	@OnPubSubEvent('reload-external-secrets-providers')
	async reloadAllProviders(): Promise<void> {
		if (this.config.externalSecretsForProjects) {
			await this.reloadProvidersFromConnectionsRepo();
			return;
		}

		this.logger.debug('Reloading all external secrets providers');
		const newSettings = await this.settingsStore.reload();

		// Reload/add providers from new settings
		for (const name of Object.keys(newSettings)) {
			await this.reloadProvider(name);
		}

		await this.secretsCache.refreshAll();
		this.logger.debug('Reloaded all external secrets providers');
	}

	private async reloadProvidersFromConnectionsRepo(): Promise<void> {
		this.logger.debug('Initializing external secrets with project-based providers');
		const connections = await this.secretsProviderConnectionRepository.findAll();

		for (const connection of connections) {
			await this.tearDownProviderConnection(connection.providerKey);
			const settings: SecretsProviderSettings['settings'] = this.decryptSettings(
				connection.encryptedSettings,
			);

			const connectionSettings: SecretsProviderSettings = {
				connected: connection.isEnabled,
				connectedAt: null,
				settings,
			};

			await this.setupProvider(connection.type, connectionSettings, connection.providerKey);
		}

		await this.secretsCache.refreshAll();
		this.logger.debug('Reloaded external secrets providers');
	}

	// ========================================
	// Private - Provider Management
	// ========================================

	private async setupProvider(
		providerType: string,
		config: SecretsProviderSettings,
		providerKey?: string,
	): Promise<void> {
		const key = providerKey ?? providerType;
		const result = await this.providerLifecycle.initialize(providerType, config);

		if (!result.success || !result.provider) {
			this.logger.error(`Failed to initialize provider ${key}`, {
				error: result.error,
			});
			return;
		}

		this.providerRegistry.add(key, result.provider);

		if (config.connected) {
			await this.retryManager.runWithRetry(key, async () => await this.connectProvider(key));
		}
	}

	private async connectProvider(name: string): Promise<ProviderConnectResult> {
		const provider = this.providerRegistry.get(name);
		if (!provider) {
			this.logger.warn(`Cannot connect provider ${name}: not found in registry`);
			throw new Error(`Provider ${name} not found in registry`);
		}

		return await this.providerLifecycle.connect(provider);
	}

	private async reloadProvider(name: string): Promise<void> {
		const config = await this.settingsStore.getProvider(name);
		if (!config) {
			this.logger.warn(`Cannot reload provider ${name}: settings not found`);
			return;
		}

		await this.tearDownProviderConnection(name);
		await this.setupProvider(name, config);
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

	private decryptSettings(encryptedData: string): SecretsProviderSettings['settings'] {
		try {
			const decryptedData = this.cipher.decrypt(encryptedData);
			return jsonParse<SecretsProviderSettings['settings']>(decryptedData);
		} catch (e) {
			this.logger.error('Failed to decrypt external secrets settings', { error: e });
			throw new UnexpectedError(
				'External Secrets Settings could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}

	// ========================================
	// Public API - Secrets Refresh
	// ========================================

	async updateSecrets(): Promise<void> {
		await this.secretsCache.refreshAll();
	}

	// ========================================
	// Private - Secrets Refresh
	// ========================================

	private startSecretsRefresh(): void {
		this.refreshInterval = setInterval(
			async () => await this.secretsCache.refreshAll(),
			this.config.updateInterval * Time.seconds.toMilliseconds,
		);
		this.logger.debug('Started secrets refresh interval');
	}

	private stopSecretsRefresh(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = undefined;
		}
	}

	// ========================================
	// Private - Utilities
	// ========================================

	private broadcastReload(): void {
		void this.publisher.publishCommand({ command: 'reload-external-secrets-providers' });
	}

	private async trackProviderSave(
		vaultType: string,
		isNew: boolean,
		userId?: string,
	): Promise<void> {
		let testResult: [boolean] | [boolean, string] | undefined;
		try {
			testResult = await this.getProvider(vaultType)?.test();
		} catch {}

		this.eventService.emit('external-secrets-provider-settings-saved', {
			userId,
			vaultType,
			isNew,
			isValid: testResult?.[0] ?? false,
			errorMessage: testResult?.[1],
		});
	}

	private determineTestState(
		success: boolean,
		isConnected: boolean,
	): 'connected' | 'tested' | 'error' {
		if (!success) {
			return 'error';
		}
		return isConnected ? 'connected' : 'tested';
	}

	private getCachedSettings(): ExternalSecretsSettings {
		return this.settingsStore.getCached();
	}
}

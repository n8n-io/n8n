import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { Cipher, type IExternalSecretsManager } from 'n8n-core';
import { jsonParse, type IDataObject, ensureError, UnexpectedError } from 'n8n-workflow';

import {
	EXTERNAL_SECRETS_DB_KEY,
	EXTERNAL_SECRETS_INITIAL_BACKOFF,
	EXTERNAL_SECRETS_MAX_BACKOFF,
} from './constants';
import { ExternalSecretsProviders } from './external-secrets-providers.ee';
import { ExternalSecretsConfig } from './external-secrets.config';
import type { ExternalSecretsSettings, SecretsProvider, SecretsProviderSettings } from './types';

import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { Publisher } from '@/scaling/pubsub/publisher.service';

@Service()
export class ExternalSecretsManager implements IExternalSecretsManager {
	private providers: Record<string, SecretsProvider> = {};

	private initializingPromise?: Promise<void>;

	private cachedSettings: ExternalSecretsSettings = {};

	initialized = false;

	updateInterval?: NodeJS.Timeout;

	initRetryTimeouts: Record<string, NodeJS.Timeout> = {};

	constructor(
		private readonly logger: Logger,
		private readonly config: ExternalSecretsConfig,
		private readonly settingsRepo: SettingsRepository,
		private readonly license: License,
		private readonly secretsProviders: ExternalSecretsProviders,
		private readonly cipher: Cipher,
		private readonly eventService: EventService,
		private readonly publisher: Publisher,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(): Promise<void> {
		if (this.initialized) return;
		if (!this.initializingPromise) {
			this.initializingPromise = (async () => {
				try {
					await this.internalInit();
					this.updateInterval = setInterval(
						async () => await this.updateSecrets(),
						this.config.updateInterval * 1000,
					);
					this.initialized = true;
				} catch (error) {
					this.logger.error('External secrets manager failed to initialize', {
						error: ensureError(error),
					});
					throw error;
				} finally {
					this.initializingPromise = undefined;
				}
			})();
		}
		await this.initializingPromise;

		this.logger.debug('External secrets manager initialized');
	}

	shutdown() {
		if (this.updateInterval) clearInterval(this.updateInterval);
		Object.values(this.providers).forEach((p) => {
			// Disregard any errors as we're shutting down anyway
			void p.disconnect().catch(() => {});
		});
		Object.values(this.initRetryTimeouts).forEach((v) => clearTimeout(v));

		this.initialized = false;
		this.logger.debug('External secrets manager shut down');
	}

	@OnPubSubEvent('reload-external-secrets-providers')
	async reloadAllProviders(backoff?: number) {
		this.logger.debug('Reloading all external secrets providers');
		const providers = this.getProviderNames();
		if (!providers) {
			return;
		}
		for (const provider of providers) {
			await this.reloadProvider(provider, backoff);
		}

		await this.updateSecrets();
		this.logger.debug('External secrets managed reloaded all providers');
	}

	private broadcastReloadExternalSecretsProviders() {
		void this.publisher.publishCommand({ command: 'reload-external-secrets-providers' });
	}

	async getDecryptedSettings(): Promise<ExternalSecretsSettings | null> {
		const encryptedSettings =
			(await this.settingsRepo.findByKey(EXTERNAL_SECRETS_DB_KEY))?.value ?? null;
		if (encryptedSettings === null) {
			return null;
		}

		const decryptedData = this.cipher.decrypt(encryptedSettings);
		try {
			return jsonParse<ExternalSecretsSettings>(decryptedData);
		} catch (e) {
			throw new UnexpectedError(
				'External Secrets Settings could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}

	private async internalInit() {
		const settings = await this.getDecryptedSettings();
		if (!settings) {
			return;
		}
		const providers: Array<SecretsProvider | null> = (
			await Promise.allSettled(
				Object.entries(settings).map(
					async ([name, providerSettings]) => await this.initProvider(name, providerSettings),
				),
			)
		).map((i) => (i.status === 'rejected' ? null : i.value));
		this.providers = Object.fromEntries(
			providers.filter((p): p is SecretsProvider => p !== null).map((s) => [s.name, s]),
		);
		this.cachedSettings = settings;
		await this.updateSecrets();
	}

	private async initProvider(
		name: string,
		providerSettings: SecretsProviderSettings,
		currentBackoff = EXTERNAL_SECRETS_INITIAL_BACKOFF,
	) {
		const providerClass = this.secretsProviders.getProvider(name);
		if (!providerClass) {
			return null;
		}
		const provider: SecretsProvider = new providerClass();

		try {
			await provider.init(providerSettings);
		} catch (e) {
			this.logger.error(
				`Error initializing secrets provider ${provider.displayName} (${provider.name}).`,
			);
			this.retryInitWithBackoff(name, currentBackoff);
			return provider;
		}

		try {
			if (providerSettings.connected) {
				await provider.connect();
			}
		} catch (e) {
			try {
				await provider.disconnect();
			} catch {}
			this.logger.error(
				`Error initializing secrets provider ${provider.displayName} (${provider.name}).`,
			);
			this.retryInitWithBackoff(name, currentBackoff);
			return provider;
		}

		return provider;
	}

	private retryInitWithBackoff(name: string, currentBackoff: number) {
		if (name in this.initRetryTimeouts) {
			clearTimeout(this.initRetryTimeouts[name]);
			delete this.initRetryTimeouts[name];
		}
		this.initRetryTimeouts[name] = setTimeout(() => {
			delete this.initRetryTimeouts[name];
			if (this.providers[name] && this.providers[name].state !== 'error') {
				return;
			}
			void this.reloadProvider(name, Math.min(currentBackoff * 2, EXTERNAL_SECRETS_MAX_BACKOFF));
		}, currentBackoff);
	}

	async updateSecrets() {
		if (!this.license.isExternalSecretsEnabled()) {
			return;
		}
		await Promise.allSettled(
			Object.entries(this.providers).map(async ([k, p]) => {
				try {
					if (this.cachedSettings[k].connected && p.state === 'connected') {
						await p.update();
					}
				} catch {
					this.logger.error(`Error updating secrets provider ${p.displayName} (${p.name}).`);
				}
			}),
		);

		this.logger.debug('External secrets manager updated secrets');
	}

	getProvider(provider: string): SecretsProvider | undefined {
		return this.providers[provider];
	}

	hasProvider(provider: string): boolean {
		return provider in this.providers;
	}

	getProviderNames(): string[] {
		return Object.keys(this.providers);
	}

	getSecret(provider: string, name: string) {
		return this.getProvider(provider)?.getSecret(name);
	}

	hasSecret(provider: string, name: string): boolean {
		return this.getProvider(provider)?.hasSecret(name) ?? false;
	}

	getSecretNames(provider: string): string[] {
		return this.getProvider(provider)?.getSecretNames() ?? [];
	}

	getAllSecretNames(): Record<string, string[]> {
		return Object.fromEntries(
			Object.keys(this.providers).map((provider) => [
				provider,
				this.getSecretNames(provider) ?? [],
			]),
		);
	}

	getProvidersWithSettings(): Array<{
		provider: SecretsProvider;
		settings: SecretsProviderSettings;
	}> {
		return Object.entries(this.secretsProviders.getAllProviders()).map(([k, c]) => ({
			provider: this.getProvider(k) ?? new c(),
			settings: this.cachedSettings[k] ?? {},
		}));
	}

	getProviderWithSettings(provider: string): {
		provider: SecretsProvider;
		settings: SecretsProviderSettings;
	} {
		const providerConstructor = this.secretsProviders.getProvider(provider);
		return {
			provider: this.getProvider(provider) ?? new providerConstructor(),
			settings: this.cachedSettings[provider] ?? {},
		};
	}

	async reloadProvider(provider: string, backoff = EXTERNAL_SECRETS_INITIAL_BACKOFF) {
		if (provider in this.providers) {
			await this.providers[provider].disconnect();
			delete this.providers[provider];
		}
		const newProvider = await this.initProvider(provider, this.cachedSettings[provider], backoff);
		if (newProvider) {
			this.providers[provider] = newProvider;
		}

		this.logger.debug(`External secrets manager reloaded provider ${provider}`);
	}

	async setProviderSettings(provider: string, data: IDataObject, userId?: string) {
		let isNewProvider = false;
		let settings = await this.getDecryptedSettings();
		if (!settings) {
			settings = {};
		}
		if (!(provider in settings)) {
			isNewProvider = true;
		}
		settings[provider] = {
			connected: settings[provider]?.connected ?? false,
			connectedAt: settings[provider]?.connectedAt ?? new Date(),
			settings: data,
		};

		await this.saveAndSetSettings(settings);
		this.cachedSettings = settings;
		await this.reloadProvider(provider);
		await this.updateSecrets();
		this.broadcastReloadExternalSecretsProviders();

		void this.trackProviderSave(provider, isNewProvider, userId);
	}

	async setProviderConnected(provider: string, connected: boolean) {
		let settings = await this.getDecryptedSettings();
		if (!settings) {
			settings = {};
		}
		settings[provider] = {
			connected,
			connectedAt: connected ? new Date() : (settings[provider]?.connectedAt ?? null),
			settings: settings[provider]?.settings ?? {},
		};

		await this.saveAndSetSettings(settings);
		this.cachedSettings = settings;
		await this.reloadProvider(provider);
		await this.updateSecrets();
		this.broadcastReloadExternalSecretsProviders();
	}

	private async trackProviderSave(vaultType: string, isNew: boolean, userId?: string) {
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

	private encryptSecretsSettings(settings: ExternalSecretsSettings): string {
		return this.cipher.encrypt(settings);
	}

	async saveAndSetSettings(settings: ExternalSecretsSettings) {
		const encryptedSettings = this.encryptSecretsSettings(settings);
		await this.settingsRepo.upsert(
			{
				key: EXTERNAL_SECRETS_DB_KEY,
				value: encryptedSettings,
				loadOnStartup: false,
			},
			['key'],
		);
	}

	async testProviderSettings(
		provider: string,
		data: IDataObject,
	): Promise<{
		success: boolean;
		testState: 'connected' | 'tested' | 'error';
		error?: string;
	}> {
		let testProvider: SecretsProvider | null = null;
		try {
			testProvider = await this.initProvider(provider, {
				connected: true,
				connectedAt: new Date(),
				settings: data,
			});
			if (!testProvider) {
				return {
					success: false,
					testState: 'error',
				};
			}
			const [success, error] = await testProvider.test();
			let testState: 'connected' | 'tested' | 'error' = 'error';
			if (success && this.cachedSettings[provider]?.connected) {
				testState = 'connected';
			} else if (success) {
				testState = 'tested';
			}
			return {
				success,
				testState,
				error,
			};
		} catch {
			return {
				success: false,
				testState: 'error',
			};
		} finally {
			if (testProvider) {
				await testProvider.disconnect();
			}
		}
	}

	async updateProvider(provider: string): Promise<boolean> {
		if (!this.license.isExternalSecretsEnabled()) {
			return false;
		}
		if (!this.providers[provider] || this.providers[provider].state !== 'connected') {
			return false;
		}
		try {
			await this.providers[provider].update();
			this.broadcastReloadExternalSecretsProviders();
			this.logger.debug(`External secrets manager updated provider ${provider}`);
			return true;
		} catch (error) {
			this.logger.debug(`External secrets manager failed to update provider ${provider}`, {
				error: ensureError(error),
			});
			return false;
		}
	}
}

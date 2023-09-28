import { SettingsRepository } from '@/databases/repositories';
import type {
	ExternalSecretsSettings,
	SecretsProvider,
	SecretsProviderSettings,
} from '@/Interfaces';

import { UserSettings } from 'n8n-core';
import Container, { Service } from 'typedi';

import { AES, enc } from 'crypto-js';
import { getLogger } from '@/Logger';

import type { IDataObject } from 'n8n-workflow';
import {
	EXTERNAL_SECRETS_INITIAL_BACKOFF,
	EXTERNAL_SECRETS_MAX_BACKOFF,
	EXTERNAL_SECRETS_UPDATE_INTERVAL,
} from './constants';
import { License } from '@/License';
import { InternalHooks } from '@/InternalHooks';
import { ExternalSecretsProviders } from './ExternalSecretsProviders.ee';
import { OrchestrationService } from '@/services/orchestration.service';

const logger = getLogger();

@Service()
export class ExternalSecretsManager {
	private providers: Record<string, SecretsProvider> = {};

	private initializingPromise?: Promise<void>;

	private cachedSettings: ExternalSecretsSettings = {};

	initialized = false;

	updateInterval: NodeJS.Timer;

	initRetryTimeouts: Record<string, NodeJS.Timer> = {};

	constructor(
		private settingsRepo: SettingsRepository,
		private license: License,
		private secretsProviders: ExternalSecretsProviders,
	) {}

	async init(): Promise<void> {
		if (!this.initialized) {
			if (!this.initializingPromise) {
				this.initializingPromise = new Promise<void>(async (resolve) => {
					await this.internalInit();
					this.initialized = true;
					resolve();
					this.initializingPromise = undefined;
					this.updateInterval = setInterval(
						async () => this.updateSecrets(),
						EXTERNAL_SECRETS_UPDATE_INTERVAL,
					);
				});
			}
			return this.initializingPromise;
		}
	}

	shutdown() {
		clearInterval(this.updateInterval);
		Object.values(this.providers).forEach((p) => {
			// Disregard any errors as we're shutting down anyway
			void p.disconnect().catch(() => {});
		});
		Object.values(this.initRetryTimeouts).forEach((v) => clearTimeout(v));
	}

	async reloadAllProviders(backoff?: number) {
		logger.debug('Reloading all external secrets providers');
		const providers = this.getProviderNames();
		if (!providers) {
			return;
		}
		for (const provider of providers) {
			await this.reloadProvider(provider, backoff);
		}
	}

	async broadcastReloadExternalSecretsProviders() {
		await Container.get(OrchestrationService).broadcastReloadExternalSecretsProviders();
	}

	private async getEncryptionKey(): Promise<string> {
		return UserSettings.getEncryptionKey();
	}

	private decryptSecretsSettings(value: string, encryptionKey: string): ExternalSecretsSettings {
		const decryptedData = AES.decrypt(value, encryptionKey);

		try {
			return JSON.parse(decryptedData.toString(enc.Utf8)) as ExternalSecretsSettings;
		} catch (e) {
			throw new Error(
				'External Secrets Settings could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}

	private async getDecryptedSettings(
		settingsRepo: SettingsRepository,
	): Promise<ExternalSecretsSettings | null> {
		const encryptedSettings = await settingsRepo.getEncryptedSecretsProviderSettings();
		if (encryptedSettings === null) {
			return null;
		}
		const encryptionKey = await this.getEncryptionKey();
		return this.decryptSecretsSettings(encryptedSettings, encryptionKey);
	}

	private async internalInit() {
		const settings = await this.getDecryptedSettings(this.settingsRepo);
		if (!settings) {
			return;
		}
		const providers: Array<SecretsProvider | null> = (
			await Promise.allSettled(
				Object.entries(settings).map(async ([name, providerSettings]) =>
					this.initProvider(name, providerSettings),
				),
			)
		).map((i) => (i.status === 'rejected' ? null : i.value));
		this.providers = Object.fromEntries(
			(providers.filter((p) => p !== null) as SecretsProvider[]).map((s) => [s.name, s]),
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
			logger.error(
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
			logger.error(
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
					logger.error(`Error updating secrets provider ${p.displayName} (${p.name}).`);
				}
			}),
		);
	}

	getProvider(provider: string): SecretsProvider | undefined {
		return this.providers[provider];
	}

	hasProvider(provider: string): boolean {
		return provider in this.providers;
	}

	getProviderNames(): string[] | undefined {
		return Object.keys(this.providers);
	}

	getSecret(provider: string, name: string): IDataObject | undefined {
		return this.getProvider(provider)?.getSecret(name);
	}

	hasSecret(provider: string, name: string): boolean {
		return this.getProvider(provider)?.hasSecret(name) ?? false;
	}

	getSecretNames(provider: string): string[] | undefined {
		return this.getProvider(provider)?.getSecretNames();
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

	getProviderWithSettings(provider: string):
		| {
				provider: SecretsProvider;
				settings: SecretsProviderSettings;
		  }
		| undefined {
		const providerConstructor = this.secretsProviders.getProvider(provider);
		if (!providerConstructor) {
			return undefined;
		}
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
	}

	async setProviderSettings(provider: string, data: IDataObject, userId?: string) {
		let isNewProvider = false;
		let settings = await this.getDecryptedSettings(this.settingsRepo);
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

		await this.saveAndSetSettings(settings, this.settingsRepo);
		this.cachedSettings = settings;
		await this.reloadProvider(provider);
		await this.broadcastReloadExternalSecretsProviders();

		void this.trackProviderSave(provider, isNewProvider, userId);
	}

	async setProviderConnected(provider: string, connected: boolean) {
		let settings = await this.getDecryptedSettings(this.settingsRepo);
		if (!settings) {
			settings = {};
		}
		settings[provider] = {
			connected,
			connectedAt: connected ? new Date() : settings[provider]?.connectedAt ?? null,
			settings: settings[provider]?.settings ?? {},
		};

		await this.saveAndSetSettings(settings, this.settingsRepo);
		this.cachedSettings = settings;
		await this.reloadProvider(provider);
		await this.updateSecrets();
		await this.broadcastReloadExternalSecretsProviders();
	}

	private async trackProviderSave(vaultType: string, isNew: boolean, userId?: string) {
		let testResult: [boolean] | [boolean, string] | undefined;
		try {
			testResult = await this.getProvider(vaultType)?.test();
		} catch {}
		void Container.get(InternalHooks).onExternalSecretsProviderSettingsSaved({
			user_id: userId,
			vault_type: vaultType,
			is_new: isNew,
			is_valid: testResult?.[0] ?? false,
			error_message: testResult?.[1],
		});
	}

	encryptSecretsSettings(settings: ExternalSecretsSettings, encryptionKey: string): string {
		return AES.encrypt(JSON.stringify(settings), encryptionKey).toString();
	}

	async saveAndSetSettings(settings: ExternalSecretsSettings, settingsRepo: SettingsRepository) {
		const encryptionKey = await this.getEncryptionKey();
		const encryptedSettings = this.encryptSecretsSettings(settings, encryptionKey);
		await settingsRepo.saveEncryptedSecretsProviderSettings(encryptedSettings);
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
			await this.broadcastReloadExternalSecretsProviders();
			return true;
		} catch {
			return false;
		}
	}
}

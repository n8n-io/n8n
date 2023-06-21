import { SettingsRepository } from '@/databases/repositories';
import type {
	ExternalSecretsSettings,
	SecretsProvider,
	SecretsProviderSettings,
} from '@/Interfaces';

import { UserSettings } from 'n8n-core';
import { Service } from 'typedi';

import { AES, enc } from 'crypto-js';
import { getLogger } from '@/Logger';

import type { IDataObject } from 'n8n-workflow';
import { InfisicalProvider } from './providers/infisical';
import { EXTERNAL_SECRETS_UPDATE_INTERVAL } from './constants';

const logger = getLogger();

const PROVIDER_MAP: Record<string, { new (): SecretsProvider }> = {
	infisical: InfisicalProvider,
};

@Service()
export class ExternalSecretsManager {
	private providers: Record<string, SecretsProvider> = {};

	private initializingPromise?: Promise<void>;

	private cachedSettings: ExternalSecretsSettings = {};

	initialized = false;

	updateInterval: NodeJS.Timer;

	constructor(private settingsRepo: SettingsRepository) {}

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
		const providers: Array<SecretsProvider | null> = await Promise.all(
			Object.entries(settings).map(async ([name, providerSettings]) =>
				this.initProvider(name, providerSettings),
			),
		);
		this.providers = Object.fromEntries(
			(providers.filter((p) => p !== null) as SecretsProvider[]).map((s) => [s.name, s]),
		);
		this.cachedSettings = settings;
		await this.updateSecrets();
	}

	private async initProvider(name: string, providerSettings: SecretsProviderSettings) {
		const providerClass = PROVIDER_MAP[name];
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
			return null;
		}

		try {
			if (providerSettings.connected) {
				await provider.connect();
			}
		} catch (e) {
			logger.error(
				`Error initializing secrets provider ${provider.displayName} (${provider.name}).`,
			);
			return null;
		}

		return provider;
	}

	async updateSecrets() {
		await Promise.all(
			Object.entries(this.providers).map(async ([k, p]) => {
				if (this.cachedSettings[k].connected) {
					await p.update();
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

	getSecret(provider: string, name: string): string | undefined {
		return this.getProvider(provider)?.getSecret(name);
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
		return Object.entries(PROVIDER_MAP).map(([k, c]) => ({
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
		if (!(provider in PROVIDER_MAP)) {
			return undefined;
		}
		return {
			provider: this.getProvider(provider) ?? new PROVIDER_MAP[provider](),
			settings: this.cachedSettings[provider] ?? {},
		};
	}

	async setProviderSettings(provider: string, data: IDataObject) {
		await this.settingsRepo.manager.transaction(async (em) => {
			const settingsRepo = new SettingsRepository(em.connection);

			let settings = await this.getDecryptedSettings(settingsRepo);
			if (!settings) {
				settings = {};
			}
			settings[provider] = {
				connected: settings[provider]?.connected ?? false,
				connectedAt: settings[provider]?.connectedAt ?? new Date(),
				settings: data,
			};

			await this.saveAndSetSettings(settings, settingsRepo);
			this.cachedSettings = settings;
		});
		const newProvider = await this.initProvider(provider, this.cachedSettings[provider]);
		if (newProvider) {
			this.providers[provider] = newProvider;
		} else {
			// Delete it so we're not fetching old values
			delete this.providers[provider];
		}
		await this.updateSecrets();
	}

	async setProviderConnected(provider: string, connected: boolean) {
		await this.settingsRepo.manager.transaction(async (em) => {
			const settingsRepo = new SettingsRepository(em.connection);

			let settings = await this.getDecryptedSettings(settingsRepo);
			if (!settings) {
				settings = {};
			}
			settings[provider] = {
				connected,
				connectedAt: connected ? new Date() : settings[provider]?.connectedAt ?? null,
				settings: settings[provider]?.settings ?? {},
			};

			await this.saveAndSetSettings(settings, settingsRepo);
			this.cachedSettings = settings;
		});
		const newProvider = await this.initProvider(provider, this.cachedSettings[provider]);
		if (newProvider) {
			this.providers[provider] = newProvider;
		} else {
			// Delete it so we're not fetching old values
			delete this.providers[provider];
		}
		await this.updateSecrets();
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
	}> {
		try {
			const testProvider = await this.initProvider(provider, {
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
			const success = await testProvider.test();
			let testState: 'connected' | 'tested' | 'error' = 'error';
			if (success && this.cachedSettings[provider]?.connected) {
				testState = 'connected';
			} else if (success) {
				testState = 'tested';
			}
			return {
				success,
				testState,
			};
		} catch {
			return {
				success: false,
				testState: 'error',
			};
		}
	}
}

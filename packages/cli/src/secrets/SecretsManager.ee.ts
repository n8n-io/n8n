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
import { VaultProvider } from './providers/vault';
import { EXTERNAL_SECRETS_UPDATE_INTERVAL } from './constants';
import { License } from '@/License';

const logger = getLogger();

const PROVIDER_MAP: Record<string, { new (): SecretsProvider }> = {
	infisical: InfisicalProvider,
	vault: VaultProvider,
};

@Service()
export class ExternalSecretsManager {
	private providers: Record<string, SecretsProvider> = {};

	private initializingPromise?: Promise<void>;

	private cachedSettings: ExternalSecretsSettings = {};

	initialized = false;

	updateInterval: NodeJS.Timer;

	constructor(private settingsRepo: SettingsRepository, private license: License) {}

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
			void p.disconnect();
		});
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
			try {
				await provider.disconnect();
			} catch {}
			logger.error(
				`Error initializing secrets provider ${provider.displayName} (${provider.name}).`,
			);
			return null;
		}

		return provider;
	}

	async updateSecrets() {
		if (!this.license.isExternalSecretsEnabled()) {
			return;
		}
		await Promise.all(
			Object.entries(this.providers).map(async ([k, p]) => {
				try {
					if (this.cachedSettings[k].connected) {
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

	async reloadProvider(provider: string) {
		if (provider in this.providers) {
			await this.providers[provider].disconnect();
			delete this.providers[provider];
		}
		const newProvider = await this.initProvider(provider, this.cachedSettings[provider]);
		if (newProvider) {
			this.providers[provider] = newProvider;
		}
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
		await this.reloadProvider(provider);
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
		await this.reloadProvider(provider);
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
		try {
			await this.providers[provider].update();
			return true;
		} catch {
			return false;
		}
	}
}

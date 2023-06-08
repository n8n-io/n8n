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

import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { InfisicalProvider } from './providers/infisical';

const logger = getLogger();

class DummyProvider implements SecretsProvider {
	private static DATA: Record<string, string> = {
		password: 'testpassword',
		api_key: 'testapikey',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			default: '',
			placeholder: 'Username',
			type: 'string',
		},
		{
			displayName: 'Password',
			name: 'password',
			default: '',
			placeholder: '*********',
			type: 'string',
			typeOptions: {
				password: true,
			},
		},
	];

	displayName = 'Dummy Provider';

	name = 'dummy';

	initialized = false;

	async init(): Promise<void> {
		this.initialized = true;
	}

	async update(): Promise<void> {
		//
	}

	async connect(): Promise<void> {
		//
	}

	async test() {
		return true;
	}

	getSecret(name: string): string {
		return DummyProvider.DATA[name];
	}

	getSecretNames(): string[] {
		return Object.keys(DummyProvider.DATA);
	}
}

class Dummy2Provider implements SecretsProvider {
	private static DATA: Record<string, string> = {
		password: 'testpassword',
		api_key: 'testapikey',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			default: '',
			placeholder: 'Username',
			type: 'string',
		},
		{
			displayName: 'Password',
			name: 'password',
			default: '',
			placeholder: '*********',
			type: 'string',
			typeOptions: {
				password: true,
			},
		},
	];

	displayName = 'Dummy2 Provider';

	name = 'dummy2';

	initialized = false;

	async init(): Promise<void> {
		this.initialized = true;
	}

	async update(): Promise<void> {
		//
	}

	async connect(): Promise<void> {
		//
	}

	async test() {
		return false;
	}

	getSecret(name: string): string {
		return Dummy2Provider.DATA[name];
	}

	getSecretNames(): string[] {
		return Object.keys(Dummy2Provider.DATA);
	}
}

const PROVIDER_MAP: Record<string, { new (): SecretsProvider }> = {
	dummy: DummyProvider,
	dummy2: Dummy2Provider,
	infisical: InfisicalProvider,
};

@Service()
export class ExternalSecretsManager {
	private providers: Record<string, SecretsProvider> = {};

	private initializingPromise?: Promise<void>;

	private cachedSettings: ExternalSecretsSettings = {};

	initialized = false;

	constructor(private settingsRepo: SettingsRepository) {}

	async init(): Promise<void> {
		if (!this.initialized) {
			if (!this.initializingPromise) {
				this.initializingPromise = new Promise<void>(async (resolve) => {
					await this.internalInit();
					this.initialized = true;
					resolve();
					this.initializingPromise = undefined;
				});
			}
			return this.initializingPromise;
		}
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
		await Promise.all(Object.values(this.providers).map(async (p) => p.update()));
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

	encryptSecretsSettings(settings: ExternalSecretsSettings, encryptionKey: string): string {
		return AES.encrypt(JSON.stringify(settings), encryptionKey).toString();
	}

	async saveAndSetSettings(settings: ExternalSecretsSettings, settingsRepo: SettingsRepository) {
		const encryptionKey = await this.getEncryptionKey();
		const encryptedSettings = this.encryptSecretsSettings(settings, encryptionKey);
		await settingsRepo.saveEncryptedSecretsProviderSettings(encryptedSettings);
	}
}

import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import { EXTERNAL_SECRETS_DB_KEY } from './constants';
import type { ExternalSecretsSettings, SecretsProviderSettings } from './types';

/**
 * Handles encrypted persistence of secrets provider settings
 * Provides atomic operations for loading and updating settings
 * Maintains an in-memory cache to avoid repeated DB calls
 */
@Service()
export class ExternalSecretsSettingsStore {
	private cache: ExternalSecretsSettings | null = null;

	constructor(
		private readonly settingsRepo: SettingsRepository,
		private readonly cipher: Cipher,
	) {}

	/**
	 * Load all provider settings (from cache if available, otherwise from database)
	 */
	async load(): Promise<ExternalSecretsSettings> {
		if (this.cache !== null) {
			return this.cache;
		}

		return await this.reload();
	}

	/**
	 * Reload settings from database and update cache
	 * Use this when settings may have changed in DB (e.g., pubsub reload events)
	 */
	async reload(): Promise<ExternalSecretsSettings> {
		const encryptedSettings =
			(await this.settingsRepo.findByKey(EXTERNAL_SECRETS_DB_KEY))?.value ?? null;

		if (encryptedSettings === null) {
			this.cache = {};
			return {};
		}

		this.cache = this.decrypt(encryptedSettings);
		return this.cache;
	}

	/**
	 * Get cached settings synchronously (returns empty object if not yet loaded)
	 */
	getCached(): ExternalSecretsSettings {
		return this.cache ?? {};
	}

	/**
	 * Save all provider settings to database and update cache
	 */
	async save(settings: ExternalSecretsSettings): Promise<void> {
		const encryptedSettings = this.encrypt(settings);

		await this.settingsRepo.upsert(
			{
				key: EXTERNAL_SECRETS_DB_KEY,
				value: encryptedSettings,
				loadOnStartup: false,
			},
			['key'],
		);

		// Update cache
		this.cache = settings;
	}

	/**
	 * Update settings for a specific provider
	 */
	async updateProvider(
		providerName: string,
		partialSettings: Partial<SecretsProviderSettings>,
	): Promise<{ settings: ExternalSecretsSettings; isNewProvider: boolean }> {
		const loadedSettings = await this.reload();
		// Create a shallow copy to avoid mutating the cache before save
		const settings = { ...loadedSettings };
		const isNewProvider = !(providerName in settings);

		const defaultValues: SecretsProviderSettings = {
			connected: false,
			connectedAt: null,
			settings: {},
		};

		settings[providerName] = {
			...(settings[providerName] ?? defaultValues),
			...partialSettings,
		};

		await this.save(settings);

		return { settings, isNewProvider };
	}

	/**
	 * Get settings for a specific provider
	 */
	async getProvider(providerName: string): Promise<SecretsProviderSettings | undefined> {
		const settings = await this.load();
		return settings[providerName];
	}

	/**
	 * Remove a provider from settings
	 */
	async removeProvider(providerName: string): Promise<void> {
		const loadedSettings = await this.load();
		// Create a shallow copy to avoid mutating the cache before save
		const settings = { ...loadedSettings };
		delete settings[providerName];
		await this.save(settings);
	}

	/**
	 * Decrypt settings from database
	 */
	private decrypt(encryptedData: string): ExternalSecretsSettings {
		const decryptedData = this.cipher.decrypt(encryptedData);

		try {
			return jsonParse<ExternalSecretsSettings>(decryptedData);
		} catch (e) {
			throw new UnexpectedError(
				'External Secrets Settings could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}

	/**
	 * Encrypt settings for database storage
	 */
	private encrypt(settings: ExternalSecretsSettings): string {
		return this.cipher.encrypt(settings);
	}
}

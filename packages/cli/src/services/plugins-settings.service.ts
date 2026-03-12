import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { PluginsSettingsDto } from '@n8n/api-types';
import { Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { UnexpectedError, UserError } from 'n8n-workflow';

const MERGE_DEV_ENABLED_KEY = 'plugins.mergeDev.enabled';
const MERGE_DEV_API_KEY = 'plugins.mergeDev.apiKey';

@Service()
export class PluginsSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
	) {}

	async getPluginsSettings(): Promise<PluginsSettingsDto> {
		const rows = await this.settingsRepository.findByKeys([
			MERGE_DEV_ENABLED_KEY,
			MERGE_DEV_API_KEY,
		]);

		const enabledRow = rows.find((r) => r.key === MERGE_DEV_ENABLED_KEY);
		const apiKeyRow = rows.find((r) => r.key === MERGE_DEV_API_KEY);

		const mergeDevEnabled = enabledRow?.value === 'true';
		const mergeDevApiKey = apiKeyRow ? this.decryptApiKey(apiKeyRow.value) : '';

		return { mergeDevEnabled, mergeDevApiKey };
	}

	async updatePluginsSettings(dto: {
		mergeDevEnabled?: boolean;
		mergeDevApiKey?: string;
	}): Promise<PluginsSettingsDto> {
		if (dto.mergeDevEnabled !== undefined) {
			await this.settingsRepository.upsert(
				{
					key: MERGE_DEV_ENABLED_KEY,
					value: dto.mergeDevEnabled.toString(),
					loadOnStartup: false,
				},
				['key'],
			);
		}

		if (dto.mergeDevApiKey !== undefined) {
			await this.settingsRepository.upsert(
				{
					key: MERGE_DEV_API_KEY,
					value: this.cipher.encrypt(dto.mergeDevApiKey),
					loadOnStartup: false,
				},
				['key'],
			);
		}

		return await this.getPluginsSettings();
	}

	private decryptApiKey(encryptedValue: string): string {
		try {
			return this.cipher.decrypt(encryptedValue);
		} catch {
			throw new UnexpectedError(
				'Plugins settings API key could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}

	async getMergeDevApiKey(): Promise<string | null> {
		const row = await this.settingsRepository.findByKey(MERGE_DEV_API_KEY);
		if (!row) return null;
		return this.decryptApiKey(row.value);
	}

	async injectPluginManagedCredentials(
		type: string,
		data: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		switch (type) {
			case 'mergeDevApi': {
				if (!data.useManagedApiKey) return data;
				const settings = await this.getPluginsSettings();
				if (!settings.mergeDevEnabled) {
					throw new UserError(
						'This credential requires the Merge.dev integration to be enabled. Ask your instance owner to turn it on in Settings → Plugins.',
					);
				}
				return { ...data, apiKey: settings.mergeDevApiKey };
			}
			default:
				return data;
		}
	}
}

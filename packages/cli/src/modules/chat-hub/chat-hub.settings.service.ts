import { ChatHubLLMProvider, ChatProviderSettingsDto } from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

const WILDCARD = '%';
const CHAT_PROVIDER_SETTINGS_KEY = (provider: ChatHubLLMProvider | typeof WILDCARD) =>
	`chat.provider.${provider}`;
const CHAT_ENABLED_KEY = 'chat.access.enabled';

const getDefaultProviderSettings = (provider: ChatHubLLMProvider): ChatProviderSettingsDto => ({
	provider,
	credentialId: null,
	limitModels: false,
	createdAt: new Date().toISOString(),
	updatedAt: null,
	enabled: true,
});

@Service()
export class ChatHubSettingsService {
	constructor(private readonly settingsRepository: SettingsRepository) {}

	async getEnabled(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(CHAT_ENABLED_KEY);
		// Allowed by default
		if (!row) return true;
		return row.value === 'true';
	}

	async setEnabled(enabled: boolean): Promise<void> {
		const value = enabled ? 'true' : 'false';
		await this.settingsRepository.upsert({ key: CHAT_ENABLED_KEY, value, loadOnStartup: true }, [
			'key',
		]);
	}

	async getProviderSettings(provider: ChatHubLLMProvider): Promise<ChatProviderSettingsDto | null> {
		const settings = await this.settingsRepository.findByKey(CHAT_PROVIDER_SETTINGS_KEY(provider));
		if (!settings) {
			return getDefaultProviderSettings(provider);
		}

		return jsonParse<ChatProviderSettingsDto | null>(settings.value, { fallbackValue: null });
	}

	async getAllProviderSettings(): Promise<ChatProviderSettingsDto[]> {
		const settings = await this.settingsRepository.findAllLike(
			CHAT_PROVIDER_SETTINGS_KEY(WILDCARD),
		);

		if (!settings) {
			return [];
		}

		return settings.map((setting) => jsonParse<ChatProviderSettingsDto>(setting.value));
	}

	async setProviderSettings(
		provider: ChatHubLLMProvider,
		settings: ChatProviderSettingsDto,
	): Promise<void> {
		const value = JSON.stringify({
			...settings,
			createdAt: settings.createdAt ?? new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		await this.settingsRepository.upsert(
			{ key: CHAT_PROVIDER_SETTINGS_KEY(provider), value, loadOnStartup: true },
			['key'],
		);
	}
}

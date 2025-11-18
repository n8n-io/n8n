import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import {
	ChatHubConversationModel,
	ChatHubLLMProvider,
	chatHubLLMProviderSchema,
	ChatProviderSettingsDto,
} from '@n8n/api-types';
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
	allowedModels: [],
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

	async ensureModelIsAllowed(model: ChatHubConversationModel): Promise<void> {
		if (model.provider === 'custom-agent' || model.provider === 'n8n') {
			// Custom agents and n8n models are always allowed, for now
			return;
		}

		const settings = await this.getProviderSettings(model.provider);
		if (!settings.enabled) {
			throw new BadRequestError('Provider is not enabled');
		}

		if (settings.limitModels && !settings.allowedModels.some((m) => m.model === model.model)) {
			throw new BadRequestError(`Model ${model.model} is not allowed`);
		}

		return;
	}

	async getProviderSettings(provider: ChatHubLLMProvider): Promise<ChatProviderSettingsDto> {
		const settings = await this.settingsRepository.findByKey(CHAT_PROVIDER_SETTINGS_KEY(provider));
		if (!settings) {
			return getDefaultProviderSettings(provider);
		}

		return jsonParse<ChatProviderSettingsDto>(settings.value, {
			fallbackValue: getDefaultProviderSettings(provider),
		});
	}

	async getAllProviderSettings(): Promise<ChatProviderSettingsDto[]> {
		const settings = await this.settingsRepository.findAllLike(
			CHAT_PROVIDER_SETTINGS_KEY(WILDCARD),
		);

		const parsedSettings = settings.map((setting) =>
			jsonParse<ChatProviderSettingsDto>(setting.value),
		);

		// Ensure each provider has settings, even if none are stored yet
		for (const provider of Object.values(chatHubLLMProviderSchema.options)) {
			const hasSettings = parsedSettings.some((setting) => {
				return setting.provider === provider;
			});

			if (!hasSettings) {
				parsedSettings?.push(getDefaultProviderSettings(provider));
			}
		}

		return parsedSettings;
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

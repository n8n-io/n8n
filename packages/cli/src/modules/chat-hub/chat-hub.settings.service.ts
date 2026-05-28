import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import {
	ChatHubConversationModel,
	ChatHubLLMProvider,
	chatHubLLMProviderSchema,
	ChatProviderSettingsDto,
	VECTOR_STORE_PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubSemanticSearchSettings,
} from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import type { SemanticSearchOptions } from './chat-hub.types';
import { VECTOR_STORE_NODE_TYPE_MAP } from './chat-hub.constants';
import { DEFAULT_SEMANTIC_SEARCH_SETTINGS } from '@n8n/chat-hub';

const CHAT_PROVIDER_SETTINGS_KEY_PREFIX = 'chat.provider.';
const CHAT_PROVIDER_SETTINGS_KEY = (provider: ChatHubLLMProvider) =>
	`${CHAT_PROVIDER_SETTINGS_KEY_PREFIX}${provider}`;
const CHAT_ENABLED_KEY = 'chat.access.enabled';
const CHAT_SEMANTIC_SEARCH_SETTINGS_KEY = 'chat.semantic-search';

const getDefaultProviderSettings = (provider: ChatHubLLMProvider): ChatProviderSettingsDto => ({
	provider,
	credentialId: null,
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

	async ensureModelIsAllowed(model: ChatHubConversationModel, trx?: EntityManager): Promise<void> {
		if (model.provider === 'custom-agent' || model.provider === 'n8n') {
			// Custom agents and n8n models are always allowed, for now
			return;
		}

		const settings = await this.getProviderSettings(model.provider, trx);
		if (!settings.enabled) {
			throw new BadRequestError('Provider is not enabled');
		}

		if (
			settings.allowedModels.length > 0 &&
			!settings.allowedModels.some((m) => m.model === model.model)
		) {
			throw new BadRequestError(`Model ${model.model} is not allowed`);
		}

		return;
	}

	async getProviderSettings(
		provider: ChatHubLLMProvider,
		trx?: EntityManager,
	): Promise<ChatProviderSettingsDto> {
		const settings = await this.settingsRepository.findByKey(
			CHAT_PROVIDER_SETTINGS_KEY(provider),
			trx,
		);
		if (!settings) {
			return getDefaultProviderSettings(provider);
		}

		return jsonParse<ChatProviderSettingsDto>(settings.value, {
			fallbackValue: getDefaultProviderSettings(provider),
		});
	}

	async getAllProviderSettings(): Promise<Record<ChatHubLLMProvider, ChatProviderSettingsDto>> {
		const settings = await this.settingsRepository.findByKeyPrefix(
			CHAT_PROVIDER_SETTINGS_KEY_PREFIX,
		);

		const persistedByProvider = new Map<ChatHubLLMProvider, ChatProviderSettingsDto>();

		for (const setting of settings) {
			const parsed = jsonParse<ChatProviderSettingsDto>(setting.value);
			persistedByProvider.set(parsed.provider, parsed);
		}

		const result = {} as Record<ChatHubLLMProvider, ChatProviderSettingsDto>;

		// Ensure each provider has settings (use default if missing)
		for (const provider of chatHubLLMProviderSchema.options) {
			result[provider] = persistedByProvider.get(provider) ?? getDefaultProviderSettings(provider);
		}

		return result;
	}

	async getSemanticSearchSettings(): Promise<ChatHubSemanticSearchSettings> {
		const row = await this.settingsRepository.findByKey(CHAT_SEMANTIC_SEARCH_SETTINGS_KEY);

		if (!row) {
			return DEFAULT_SEMANTIC_SEARCH_SETTINGS;
		}

		return jsonParse<ChatHubSemanticSearchSettings>(row.value);
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

	async setSemanticSearchSettings(settings: ChatHubSemanticSearchSettings): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: CHAT_SEMANTIC_SEARCH_SETTINGS_KEY,
				value: JSON.stringify(settings),
				loadOnStartup: true,
			},
			['key'],
		);
	}

	async getSemanticSearchOptions(): Promise<SemanticSearchOptions | null> {
		const settings = await this.getSemanticSearchSettings();

		if (!settings.embeddingModel.credentialId || !settings.vectorStore.credentialId) {
			// return null if not fully configured
			return null;
		}

		return {
			embeddingModel: {
				provider: settings.embeddingModel.provider,
				credentialId: settings.embeddingModel.credentialId,
			},
			vectorStore: {
				nodeType: VECTOR_STORE_NODE_TYPE_MAP[settings.vectorStore.provider],
				credentialType: VECTOR_STORE_PROVIDER_CREDENTIAL_TYPE_MAP[settings.vectorStore.provider],
				credentialId: settings.vectorStore.credentialId,
			},
		};
	}
}

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import {
	ChatHubConversationModel,
	ChatHubLLMProvider,
	chatHubLLMProviderSchema,
	ChatProviderSettingsDto,
} from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

const CHAT_PROVIDER_SETTINGS_KEY_PREFIX = 'chat.provider.';
const CHAT_PROVIDER_SETTINGS_KEY = (provider: ChatHubLLMProvider) =>
	`${CHAT_PROVIDER_SETTINGS_KEY_PREFIX}${provider}`;
const CHAT_ENABLED_KEY = 'chat.access.enabled';
const CHAT_VECTOR_STORE_CREDENTIAL_KEY = 'chat.vector-store-credential-id';
const CHAT_EMBEDDING_CREDENTIAL_KEY = 'chat.embedding-credential';

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

	async getVectorStoreCredentialId(): Promise<string | null> {
		const row = await this.settingsRepository.findByKey(CHAT_VECTOR_STORE_CREDENTIAL_KEY);
		return row?.value ?? null;
	}

	async getEmbeddingCredential(): Promise<{ type: string; id: string } | null> {
		const row = await this.settingsRepository.findByKey(CHAT_EMBEDDING_CREDENTIAL_KEY);
		if (!row) return null;
		return jsonParse<{ type: string; id: string } | null>(row.value, { fallbackValue: null });
	}

	async setEmbeddingCredential(credential: { type: string; id: string } | null): Promise<void> {
		if (credential === null) {
			await this.settingsRepository.delete({ key: CHAT_EMBEDDING_CREDENTIAL_KEY });
		} else {
			await this.settingsRepository.upsert(
				{
					key: CHAT_EMBEDDING_CREDENTIAL_KEY,
					value: JSON.stringify(credential),
					loadOnStartup: true,
				},
				['key'],
			);
		}
	}

	async setVectorStoreCredentialId(id: string | null): Promise<void> {
		if (id === null) {
			await this.settingsRepository.delete({ key: CHAT_VECTOR_STORE_CREDENTIAL_KEY });
		} else {
			await this.settingsRepository.upsert(
				{ key: CHAT_VECTOR_STORE_CREDENTIAL_KEY, value: id, loadOnStartup: true },
				['key'],
			);
		}
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

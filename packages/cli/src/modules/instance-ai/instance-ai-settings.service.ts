import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	InstanceAiSettingsResponse,
	InstanceAiSettingsUpdateRequest,
	InstanceAiModelCredential,
	InstanceAiPermissions,
} from '@n8n/api-types';
import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import type { ModelConfig } from '@n8n/instance-ai';
import { jsonParse } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

const SETTINGS_KEY = 'instanceAi.settings';

/** Credential types we support and their Mastra provider mapping. */
const CREDENTIAL_TO_MASTRA_PROVIDER: Record<string, string> = {
	openAiApi: 'openai',
	anthropicApi: 'anthropic',
	googlePalmApi: 'google',
	ollamaApi: 'ollama',
	groqApi: 'groq',
	deepSeekApi: 'deepseek',
	mistralCloudApi: 'mistral',
	xAiApi: 'xai',
	openRouterApi: 'openrouter',
	cohereApi: 'cohere',
};

const SUPPORTED_CREDENTIAL_TYPES = Object.keys(CREDENTIAL_TO_MASTRA_PROVIDER);

/** Fields that contain the base URL per credential type. */
const URL_FIELD_MAP: Record<string, string> = {
	openAiApi: 'url',
	anthropicApi: 'url',
	googlePalmApi: 'host',
	ollamaApi: 'baseUrl',
};

/** Shape stored in the DB. */
interface PersistedSettings {
	credentialId?: string | null;
	modelName?: string;
	mcpServers?: string;
	lastMessages?: number;
	embedderModel?: string;
	semanticRecallTopK?: number;
	timeout?: number;
	subAgentMaxSteps?: number;
	browserMcp?: boolean;
	sandboxEnabled?: boolean;
	sandboxProvider?: string;
	daytonaApiUrl?: string;
	daytonaApiKey?: string;
	sandboxImage?: string;
	sandboxTimeout?: number;
	braveSearchApiKey?: string;
	searxngUrl?: string;
	localGatewayDisabled?: boolean;
	permissions?: Partial<InstanceAiPermissions>;
}

@Service()
export class InstanceAiSettingsService {
	private readonly config: InstanceAiConfig;

	/** Credential ID selected in the settings panel (null = use env vars). */
	private credentialId: string | null = null;

	/** Model name selected in settings (e.g. "claude-sonnet-4-5"). */
	private modelName: string = '';

	/** When true, local gateway tools are suppressed regardless of gateway/local availability. */
	private localGatewayDisabled = false;

	/** Per-action HITL permission overrides. */
	private permissions: InstanceAiPermissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };

	constructor(
		globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {
		this.config = globalConfig.instanceAi;
	}

	/** Load persisted settings from DB and apply to the singleton config. Call on module init. */
	async loadFromDb(): Promise<void> {
		const row = await this.settingsRepository.findByKey(SETTINGS_KEY);
		if (!row) return;

		const persisted = jsonParse<PersistedSettings>(row.value, { fallbackValue: {} });
		this.applyPersistedSettings(persisted);
	}

	async getSettings(user: User): Promise<InstanceAiSettingsResponse> {
		const c = this.config;

		let credentialType: string | null = null;
		let credentialName: string | null = null;

		if (this.credentialId) {
			const cred = await this.credentialsFinderService.findCredentialForUser(
				this.credentialId,
				user,
				['credential:read'],
			);
			if (cred) {
				credentialType = cred.type;
				credentialName = cred.name;
			}
		}

		return {
			credentialId: this.credentialId,
			credentialType,
			credentialName,
			modelName: this.modelName || this.extractModelName(c.model),
			mcpServers: c.mcpServers,
			lastMessages: c.lastMessages,
			embedderModel: c.embedderModel,
			semanticRecallTopK: c.semanticRecallTopK,
			timeout: c.timeout,
			subAgentMaxSteps: c.subAgentMaxSteps,
			browserMcp: c.browserMcp,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider: c.sandboxProvider,
			daytonaApiUrl: c.daytonaApiUrl,
			hasDaytonaApiKey: !!c.daytonaApiKey,
			sandboxImage: c.sandboxImage,
			sandboxTimeout: c.sandboxTimeout,
			hasBraveSearchApiKey: !!c.braveSearchApiKey,
			searxngUrl: c.searxngUrl,
			localGatewayDisabled: this.localGatewayDisabled,
			permissions: { ...this.permissions },
		};
	}

	async updateSettings(
		user: User,
		update: InstanceAiSettingsUpdateRequest,
	): Promise<InstanceAiSettingsResponse> {
		if (update.credentialId !== undefined) this.credentialId = update.credentialId;
		if (update.modelName !== undefined) this.modelName = update.modelName;
		if (update.localGatewayDisabled !== undefined)
			this.localGatewayDisabled = update.localGatewayDisabled;
		if (update.permissions) {
			this.permissions = { ...this.permissions, ...update.permissions };
		}
		this.applyConfigFields(update);
		await this.persistToDb();
		return await this.getSettings(user);
	}

	/** List credentials the user can access that are usable as LLM providers. */
	async listModelCredentials(user: User): Promise<InstanceAiModelCredential[]> {
		const allCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);
		return allCredentials
			.filter((c) => SUPPORTED_CREDENTIAL_TYPES.includes(c.type))
			.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
				provider: CREDENTIAL_TO_MASTRA_PROVIDER[c.type] ?? 'custom',
			}));
	}

	/** Return the current HITL permission map. */
	getPermissions(): InstanceAiPermissions {
		return { ...this.permissions };
	}

	/** Whether local gateway is disabled by the user. */
	isLocalGatewayDisabled(): boolean {
		return this.localGatewayDisabled;
	}

	/** Resolve the current model configuration for an agent run. */
	async resolveModelConfig(user: User): Promise<ModelConfig> {
		if (!this.credentialId) {
			// Fall back to env var config
			return this.envVarModelConfig();
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			this.credentialId,
			user,
			['credential:read'],
		);

		if (!credential) {
			// Credential not found or not accessible — fall back to env vars
			return this.envVarModelConfig();
		}

		const provider = CREDENTIAL_TO_MASTRA_PROVIDER[credential.type];
		if (!provider) {
			return this.envVarModelConfig();
		}

		const data = this.credentialsService.decrypt(credential, true);
		const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';
		const urlField = URL_FIELD_MAP[credential.type];
		const rawUrl = urlField ? data[urlField] : undefined;
		const baseUrl = typeof rawUrl === 'string' ? rawUrl : '';
		const modelName = this.modelName || this.extractModelName(this.config.model);
		const id: `${string}/${string}` = `${provider}/${modelName}`;

		// If there's a custom base URL, use the object format
		if (baseUrl) {
			return { id, url: baseUrl, ...(apiKey ? { apiKey } : {}) };
		}

		// Built-in provider with API key override
		if (apiKey) {
			return { id, url: '', apiKey };
		}

		return id;
	}

	// --- Private helpers ---

	private envVarModelConfig(): ModelConfig {
		const { model, modelUrl, modelApiKey } = this.config;
		if (!modelUrl) return model;
		const id: `${string}/${string}` = model.includes('/')
			? (model as `${string}/${string}`)
			: `custom/${model}`;
		return { id, url: modelUrl, ...(modelApiKey ? { apiKey: modelApiKey } : {}) };
	}

	/** Extract the model name from a "provider/model" string. */
	private extractModelName(model: string): string {
		const slash = model.indexOf('/');
		return slash >= 0 ? model.slice(slash + 1) : model;
	}

	private applyPersistedSettings(persisted: PersistedSettings): void {
		if (persisted.credentialId !== undefined) this.credentialId = persisted.credentialId;
		if (persisted.modelName !== undefined) this.modelName = persisted.modelName;
		if (persisted.localGatewayDisabled !== undefined)
			this.localGatewayDisabled = persisted.localGatewayDisabled;
		if (persisted.permissions) {
			this.permissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS, ...persisted.permissions };
		}
		this.applyConfigFields(persisted);
	}

	private applyConfigFields(update: Partial<PersistedSettings>): void {
		const c = this.config;
		if (update.mcpServers !== undefined) c.mcpServers = update.mcpServers;
		if (update.lastMessages !== undefined) c.lastMessages = update.lastMessages;
		if (update.embedderModel !== undefined) c.embedderModel = update.embedderModel;
		if (update.semanticRecallTopK !== undefined) c.semanticRecallTopK = update.semanticRecallTopK;
		if (update.timeout !== undefined) c.timeout = update.timeout;
		if (update.subAgentMaxSteps !== undefined) c.subAgentMaxSteps = update.subAgentMaxSteps;
		if (update.browserMcp !== undefined) c.browserMcp = update.browserMcp;
		if (update.sandboxEnabled !== undefined) c.sandboxEnabled = update.sandboxEnabled;
		if (update.sandboxProvider !== undefined) c.sandboxProvider = update.sandboxProvider;
		if (update.daytonaApiUrl !== undefined) c.daytonaApiUrl = update.daytonaApiUrl;
		if (update.daytonaApiKey !== undefined) c.daytonaApiKey = update.daytonaApiKey;
		if (update.sandboxImage !== undefined) c.sandboxImage = update.sandboxImage;
		if (update.sandboxTimeout !== undefined) c.sandboxTimeout = update.sandboxTimeout;
		if (update.braveSearchApiKey !== undefined) c.braveSearchApiKey = update.braveSearchApiKey;
		if (update.searxngUrl !== undefined) c.searxngUrl = update.searxngUrl;
	}

	private async persistToDb(): Promise<void> {
		const c = this.config;
		const value: PersistedSettings = {
			credentialId: this.credentialId,
			modelName: this.modelName,
			mcpServers: c.mcpServers,
			lastMessages: c.lastMessages,
			embedderModel: c.embedderModel,
			semanticRecallTopK: c.semanticRecallTopK,
			timeout: c.timeout,
			subAgentMaxSteps: c.subAgentMaxSteps,
			browserMcp: c.browserMcp,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider: c.sandboxProvider,
			daytonaApiUrl: c.daytonaApiUrl,
			daytonaApiKey: c.daytonaApiKey,
			sandboxImage: c.sandboxImage,
			sandboxTimeout: c.sandboxTimeout,
			braveSearchApiKey: c.braveSearchApiKey,
			searxngUrl: c.searxngUrl,
			localGatewayDisabled: this.localGatewayDisabled,
			permissions: this.permissions,
		};

		await this.settingsRepository.upsert(
			{ key: SETTINGS_KEY, value: JSON.stringify(value), loadOnStartup: true },
			['key'],
		);
	}
}

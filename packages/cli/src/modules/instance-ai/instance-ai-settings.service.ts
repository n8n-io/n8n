import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiModelCredential,
	InstanceAiPermissions,
} from '@n8n/api-types';
import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import type { ModelConfig } from '@n8n/instance-ai';
import { jsonParse } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

const ADMIN_SETTINGS_KEY = 'instanceAi.settings';
const USER_PREFERENCES_KEY_PREFIX = 'instanceAi.preferences.';

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

// ---------------------------------------------------------------------------
// Persisted shapes (no secrets — those come from env/config only)
// ---------------------------------------------------------------------------

/** Credential types for sandbox and search services. */
const SANDBOX_CREDENTIAL_TYPES = ['daytonaApi'];
const SEARCH_CREDENTIAL_TYPES = ['braveSearchApi', 'searXngApi'];
const SERVICE_CREDENTIAL_TYPES = [...SANDBOX_CREDENTIAL_TYPES, ...SEARCH_CREDENTIAL_TYPES];

/** Admin settings stored in DB under ADMIN_SETTINGS_KEY. */
interface PersistedAdminSettings {
	lastMessages?: number;
	embedderModel?: string;
	semanticRecallTopK?: number;
	timeout?: number;
	subAgentMaxSteps?: number;
	browserMcp?: boolean;
	permissions?: Partial<InstanceAiPermissions>;
	mcpServers?: string;
	sandboxEnabled?: boolean;
	sandboxProvider?: string;
	sandboxImage?: string;
	sandboxTimeout?: number;
	daytonaCredentialId?: string | null;
	searchCredentialId?: string | null;
}

/** Per-user preferences stored under USER_PREFERENCES_KEY_PREFIX + userId. */
interface PersistedUserPreferences {
	credentialId?: string | null;
	modelName?: string;
	filesystemDisabled?: boolean;
}

@Service()
export class InstanceAiSettingsService {
	private readonly config: InstanceAiConfig;

	/** Per-action HITL permission overrides. */
	private permissions: InstanceAiPermissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };

	/** Admin-level credential IDs for sandbox and search services. */
	private adminDaytonaCredentialId: string | null = null;

	private adminSearchCredentialId: string | null = null;

	/** In-memory cache of per-user preferences keyed by userId. */
	private readonly userPreferences = new Map<string, PersistedUserPreferences>();

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
		const row = await this.settingsRepository.findByKey(ADMIN_SETTINGS_KEY);
		if (!row) return;

		const persisted = jsonParse<PersistedAdminSettings & PersistedUserPreferences>(row.value, {
			fallbackValue: {},
		});
		this.applyAdminSettings(persisted);

		// Migrate legacy user fields from admin settings (credentialId, modelName,
		// filesystemDisabled) — these were previously stored in the shared settings blob.
		// They become defaults for users who haven't set their own preferences yet.
		if (
			persisted.credentialId !== undefined ||
			persisted.modelName !== undefined ||
			persisted.filesystemDisabled !== undefined
		) {
			this.userPreferences.set('__legacy_default__', {
				credentialId: persisted.credentialId,
				modelName: persisted.modelName,
				filesystemDisabled: persisted.filesystemDisabled,
			});
		}
	}

	// ── Admin settings ────────────────────────────────────────────────────

	getAdminSettings(): InstanceAiAdminSettingsResponse {
		const c = this.config;
		return {
			lastMessages: c.lastMessages,
			embedderModel: c.embedderModel,
			semanticRecallTopK: c.semanticRecallTopK,
			timeout: c.timeout,
			subAgentMaxSteps: c.subAgentMaxSteps,
			browserMcp: c.browserMcp,
			permissions: { ...this.permissions },
			mcpServers: c.mcpServers,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider: c.sandboxProvider,
			sandboxImage: c.sandboxImage,
			sandboxTimeout: c.sandboxTimeout,
			daytonaCredentialId: this.adminDaytonaCredentialId,
			searchCredentialId: this.adminSearchCredentialId,
		};
	}

	async updateAdminSettings(
		update: InstanceAiAdminSettingsUpdateRequest,
	): Promise<InstanceAiAdminSettingsResponse> {
		const c = this.config;
		if (update.lastMessages !== undefined) c.lastMessages = update.lastMessages;
		if (update.embedderModel !== undefined) c.embedderModel = update.embedderModel;
		if (update.semanticRecallTopK !== undefined) c.semanticRecallTopK = update.semanticRecallTopK;
		if (update.timeout !== undefined) c.timeout = update.timeout;
		if (update.subAgentMaxSteps !== undefined) c.subAgentMaxSteps = update.subAgentMaxSteps;
		if (update.browserMcp !== undefined) c.browserMcp = update.browserMcp;
		if (update.permissions) {
			this.permissions = { ...this.permissions, ...update.permissions };
		}
		if (update.mcpServers !== undefined) c.mcpServers = update.mcpServers;
		if (update.sandboxEnabled !== undefined) c.sandboxEnabled = update.sandboxEnabled;
		if (update.sandboxProvider !== undefined) c.sandboxProvider = update.sandboxProvider;
		if (update.sandboxImage !== undefined) c.sandboxImage = update.sandboxImage;
		if (update.sandboxTimeout !== undefined) c.sandboxTimeout = update.sandboxTimeout;
		if (update.daytonaCredentialId !== undefined)
			this.adminDaytonaCredentialId = update.daytonaCredentialId;
		if (update.searchCredentialId !== undefined)
			this.adminSearchCredentialId = update.searchCredentialId;
		await this.persistAdminSettings();
		return this.getAdminSettings();
	}

	// ── User preferences ──────────────────────────────────────────────────

	async getUserPreferences(user: User): Promise<InstanceAiUserPreferencesResponse> {
		const prefs = await this.loadUserPreferences(user.id);
		const credentialId = prefs.credentialId ?? null;

		let credentialType: string | null = null;
		let credentialName: string | null = null;

		if (credentialId) {
			const cred = await this.credentialsFinderService.findCredentialForUser(credentialId, user, [
				'credential:read',
			]);
			if (cred) {
				credentialType = cred.type;
				credentialName = cred.name;
			}
		}

		return {
			credentialId,
			credentialType,
			credentialName,
			modelName: prefs.modelName || this.extractModelName(this.config.model),
			filesystemDisabled: prefs.filesystemDisabled ?? false,
		};
	}

	async updateUserPreferences(
		user: User,
		update: InstanceAiUserPreferencesUpdateRequest,
	): Promise<InstanceAiUserPreferencesResponse> {
		const prefs = await this.loadUserPreferences(user.id);
		if (update.credentialId !== undefined) prefs.credentialId = update.credentialId;
		if (update.modelName !== undefined) prefs.modelName = update.modelName;
		if (update.filesystemDisabled !== undefined)
			prefs.filesystemDisabled = update.filesystemDisabled;
		this.userPreferences.set(user.id, prefs);
		await this.persistUserPreferences(user.id, prefs);
		return await this.getUserPreferences(user);
	}

	// ── Shared accessors ──────────────────────────────────────────────────

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

	/** List credentials the user can access that are usable as sandbox/search services. */
	async listServiceCredentials(user: User): Promise<InstanceAiModelCredential[]> {
		const allCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);
		return allCredentials
			.filter((c) => SERVICE_CREDENTIAL_TYPES.includes(c.type))
			.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
				provider: c.type,
			}));
	}

	/** Resolve sandbox (Daytona) config from the admin-selected credential. */
	async resolveDaytonaConfig(user: User): Promise<{ apiUrl?: string; apiKey?: string }> {
		const credentialId = this.adminDaytonaCredentialId;
		if (!credentialId) {
			// Fall back to env vars
			const { daytonaApiUrl, daytonaApiKey } = this.config;
			return {
				apiUrl: daytonaApiUrl || undefined,
				apiKey: daytonaApiKey || undefined,
			};
		}
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) {
			return {};
		}
		const data = this.credentialsService.decrypt(credential, true);
		return {
			apiUrl: typeof data.apiUrl === 'string' ? data.apiUrl : undefined,
			apiKey: typeof data.apiKey === 'string' ? data.apiKey : undefined,
		};
	}

	/** Resolve search config from the admin-selected credential. */
	async resolveSearchConfig(user: User): Promise<{ braveApiKey?: string; searxngUrl?: string }> {
		const credentialId = this.adminSearchCredentialId;
		if (!credentialId) {
			// Fall back to env vars
			const { braveSearchApiKey, searxngUrl } = this.config;
			return {
				braveApiKey: braveSearchApiKey || undefined,
				searxngUrl: searxngUrl || undefined,
			};
		}
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) {
			return {};
		}
		const data = this.credentialsService.decrypt(credential, true);
		if (credential.type === 'braveSearchApi') {
			return { braveApiKey: typeof data.apiKey === 'string' ? data.apiKey : undefined };
		}
		if (credential.type === 'searXngApi') {
			return { searxngUrl: typeof data.apiUrl === 'string' ? data.apiUrl : undefined };
		}
		return {};
	}

	/** Return the current HITL permission map. */
	getPermissions(): InstanceAiPermissions {
		return { ...this.permissions };
	}

	/** Whether filesystem access is disabled by a given user. */
	isFilesystemDisabledForUser(userId: string): boolean {
		const prefs = this.userPreferences.get(userId);
		return prefs?.filesystemDisabled ?? false;
	}

	/** Whether filesystem access is disabled (legacy — uses default preferences). */
	isFilesystemDisabled(): boolean {
		// Check legacy default first, then fall back to false
		const legacy = this.userPreferences.get('__legacy_default__');
		return legacy?.filesystemDisabled ?? false;
	}

	/** Resolve the current model configuration for an agent run. */
	async resolveModelConfig(user: User): Promise<ModelConfig> {
		const prefs = await this.loadUserPreferences(user.id);
		const credentialId = prefs.credentialId ?? null;

		if (!credentialId) {
			return this.envVarModelConfig();
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);

		if (!credential) {
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
		const modelName = prefs.modelName || this.extractModelName(this.config.model);
		const id: `${string}/${string}` = `${provider}/${modelName}`;

		if (baseUrl) {
			return { id, url: baseUrl, ...(apiKey ? { apiKey } : {}) };
		}

		if (apiKey) {
			return { id, url: '', apiKey };
		}

		return id;
	}

	// ── Private helpers ───────────────────────────────────────────────────

	private envVarModelConfig(): ModelConfig {
		const { model, modelUrl, modelApiKey } = this.config;
		const id: `${string}/${string}` = model.includes('/')
			? (model as `${string}/${string}`)
			: `custom/${model}`;

		if (modelUrl) {
			return { id, url: modelUrl, ...(modelApiKey ? { apiKey: modelApiKey } : {}) };
		}

		if (modelApiKey) {
			return { id, url: '', apiKey: modelApiKey };
		}

		return model;
	}

	private extractModelName(model: string): string {
		const slash = model.indexOf('/');
		return slash >= 0 ? model.slice(slash + 1) : model;
	}

	private applyAdminSettings(persisted: PersistedAdminSettings): void {
		const c = this.config;
		if (persisted.lastMessages !== undefined) c.lastMessages = persisted.lastMessages;
		if (persisted.embedderModel !== undefined) c.embedderModel = persisted.embedderModel;
		if (persisted.semanticRecallTopK !== undefined)
			c.semanticRecallTopK = persisted.semanticRecallTopK;
		if (persisted.timeout !== undefined) c.timeout = persisted.timeout;
		if (persisted.subAgentMaxSteps !== undefined) c.subAgentMaxSteps = persisted.subAgentMaxSteps;
		if (persisted.browserMcp !== undefined) c.browserMcp = persisted.browserMcp;
		if (persisted.permissions) {
			// Migrate legacy "activateWorkflow" → "publishWorkflow"
			const perms = { ...persisted.permissions } as Record<string, unknown>;
			if ('activateWorkflow' in perms && !('publishWorkflow' in perms)) {
				perms.publishWorkflow = perms.activateWorkflow;
				delete perms.activateWorkflow;
			}
			this.permissions = {
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				...perms,
			} as typeof this.permissions;
		}
		if (persisted.mcpServers !== undefined) c.mcpServers = persisted.mcpServers;
		if (persisted.sandboxEnabled !== undefined) c.sandboxEnabled = persisted.sandboxEnabled;
		if (persisted.sandboxProvider !== undefined) c.sandboxProvider = persisted.sandboxProvider;
		if (persisted.sandboxImage !== undefined) c.sandboxImage = persisted.sandboxImage;
		if (persisted.sandboxTimeout !== undefined) c.sandboxTimeout = persisted.sandboxTimeout;
		if (persisted.daytonaCredentialId !== undefined)
			this.adminDaytonaCredentialId = persisted.daytonaCredentialId;
		if (persisted.searchCredentialId !== undefined)
			this.adminSearchCredentialId = persisted.searchCredentialId;
	}

	private async loadUserPreferences(userId: string): Promise<PersistedUserPreferences> {
		const cached = this.userPreferences.get(userId);
		if (cached) return { ...cached };

		const row = await this.settingsRepository.findByKey(`${USER_PREFERENCES_KEY_PREFIX}${userId}`);
		if (row) {
			const prefs = jsonParse<PersistedUserPreferences>(row.value, { fallbackValue: {} });
			this.userPreferences.set(userId, prefs);
			return { ...prefs };
		}

		// Fall back to legacy defaults (migrated from old shared settings)
		const legacy = this.userPreferences.get('__legacy_default__');
		return legacy ? { ...legacy } : {};
	}

	private async persistAdminSettings(): Promise<void> {
		const c = this.config;
		const value: PersistedAdminSettings = {
			lastMessages: c.lastMessages,
			embedderModel: c.embedderModel,
			semanticRecallTopK: c.semanticRecallTopK,
			timeout: c.timeout,
			subAgentMaxSteps: c.subAgentMaxSteps,
			browserMcp: c.browserMcp,
			permissions: this.permissions,
			mcpServers: c.mcpServers,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider: c.sandboxProvider,
			sandboxImage: c.sandboxImage,
			sandboxTimeout: c.sandboxTimeout,
			daytonaCredentialId: this.adminDaytonaCredentialId,
			searchCredentialId: this.adminSearchCredentialId,
		};

		await this.settingsRepository.upsert(
			{ key: ADMIN_SETTINGS_KEY, value: JSON.stringify(value), loadOnStartup: true },
			['key'],
		);
	}

	private async persistUserPreferences(
		userId: string,
		prefs: PersistedUserPreferences,
	): Promise<void> {
		await this.settingsRepository.upsert(
			{
				key: `${USER_PREFERENCES_KEY_PREFIX}${userId}`,
				value: JSON.stringify(prefs),
				loadOnStartup: false,
			},
			['key'],
		);
	}
}

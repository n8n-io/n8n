import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiModelCredential,
	InstanceAiPermissions,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig, DeploymentConfig } from '@n8n/config';
import { SettingsRepository, UserRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';
import type { IUserSettings } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { AiService } from '@/services/ai.service';
import { UserService } from '@/services/user.service';

const ADMIN_SETTINGS_KEY = 'instanceAi.settings';

type UserInstanceAiPreferences = NonNullable<IUserSettings['instanceAi']>;

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
const SANDBOX_CREDENTIAL_TYPES = ['daytonaApi', 'httpHeaderAuth'];
const SEARCH_CREDENTIAL_TYPES = ['braveSearchApi', 'searXngApi'];
const SERVICE_CREDENTIAL_TYPES = [...SANDBOX_CREDENTIAL_TYPES, ...SEARCH_CREDENTIAL_TYPES];

/** Admin settings stored in DB under ADMIN_SETTINGS_KEY. */
interface PersistedAdminSettings {
	enabled?: boolean;
	lastMessages?: number;
	embedderModel?: string;
	semanticRecallTopK?: number;
	subAgentMaxSteps?: number;
	browserMcp?: boolean;
	permissions?: Partial<InstanceAiPermissions>;
	mcpServers?: string;
	sandboxEnabled?: boolean;
	sandboxProvider?: string;
	sandboxImage?: string;
	sandboxTimeout?: number;
	daytonaCredentialId?: string | null;
	n8nSandboxCredentialId?: string | null;
	searchCredentialId?: string | null;
	localGatewayDisabled?: boolean;
	optinModalDismissed?: boolean;
}

@Service()
export class InstanceAiSettingsService {
	private readonly config: InstanceAiConfig;

	private readonly deploymentConfig: DeploymentConfig;

	/** Whether n8n Agent is enabled for this instance. */
	private enabled = true;

	/** Per-action HITL permission overrides. */
	private permissions: InstanceAiPermissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };

	/** Admin-level credential IDs for sandbox and search services. */
	private adminDaytonaCredentialId: string | null = null;

	private adminN8nSandboxCredentialId: string | null = null;

	private adminSearchCredentialId: string | null = null;

	private optinModalDismissed: boolean = false;

	constructor(
		globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly aiService: AiService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {
		this.config = globalConfig.instanceAi;
		this.deploymentConfig = globalConfig.deployment;
	}

	/** Whether this instance is running on the cloud platform. */
	private get isCloud(): boolean {
		return this.deploymentConfig.type === 'cloud';
	}

	/** Whether the AI service proxy is active (model, search, sandbox managed externally). */
	isProxyEnabled(): boolean {
		return this.aiService.isProxyEnabled();
	}

	/** Load persisted settings from DB and apply to the singleton config. Call on module init. */
	async loadFromDb(): Promise<void> {
		const row = await this.settingsRepository.findByKey(ADMIN_SETTINGS_KEY);
		if (row) {
			const persisted = jsonParse<PersistedAdminSettings>(row.value, {
				fallbackValue: {},
			});
			this.applyAdminSettings(persisted);
		}
	}

	// ── Admin settings ────────────────────────────────────────────────────

	getAdminSettings(): InstanceAiAdminSettingsResponse {
		const c = this.config;
		return {
			enabled: this.enabled,
			lastMessages: c.lastMessages,
			embedderModel: c.embedderModel,
			semanticRecallTopK: c.semanticRecallTopK,
			subAgentMaxSteps: c.subAgentMaxSteps,
			browserMcp: c.browserMcp,
			permissions: { ...this.permissions },
			mcpServers: c.mcpServers,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider: c.sandboxProvider,
			sandboxImage: c.sandboxImage,
			sandboxTimeout: c.sandboxTimeout,
			daytonaCredentialId: this.adminDaytonaCredentialId,
			n8nSandboxCredentialId: this.adminN8nSandboxCredentialId,
			searchCredentialId: this.adminSearchCredentialId,
			localGatewayDisabled: this.isLocalGatewayDisabled(),
			optinModalDismissed: this.optinModalDismissed,
		};
	}

	async updateAdminSettings(
		update: InstanceAiAdminSettingsUpdateRequest,
	): Promise<InstanceAiAdminSettingsResponse> {
		if (this.isCloud) {
			this.rejectManagedFields(
				update,
				InstanceAiSettingsService.CLOUD_MANAGED_ADMIN_FIELDS,
				'cloud',
			);
		} else if (this.aiService.isProxyEnabled()) {
			this.rejectManagedFields(
				update,
				InstanceAiSettingsService.PROXY_MANAGED_ADMIN_FIELDS,
				'proxy',
			);
		}
		const c = this.config;
		if (update.enabled !== undefined) this.enabled = update.enabled;
		if (update.lastMessages !== undefined) c.lastMessages = update.lastMessages;
		if (update.embedderModel !== undefined) c.embedderModel = update.embedderModel;
		if (update.semanticRecallTopK !== undefined) c.semanticRecallTopK = update.semanticRecallTopK;
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
		if (update.n8nSandboxCredentialId !== undefined)
			this.adminN8nSandboxCredentialId = update.n8nSandboxCredentialId;
		if (update.searchCredentialId !== undefined)
			this.adminSearchCredentialId = update.searchCredentialId;
		if (update.localGatewayDisabled !== undefined)
			c.localGatewayDisabled = update.localGatewayDisabled;
		if (update.optinModalDismissed !== undefined)
			this.optinModalDismissed = update.optinModalDismissed;
		await this.persistAdminSettings();
		return this.getAdminSettings();
	}

	// ── User preferences ──────────────────────────────────────────────────

	async getUserPreferences(user: User): Promise<InstanceAiUserPreferencesResponse> {
		const prefs = this.readUserPreferences(user);
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
			localGatewayDisabled: prefs.localGatewayDisabled ?? false,
		};
	}

	async updateUserPreferences(
		user: User,
		update: InstanceAiUserPreferencesUpdateRequest,
	): Promise<InstanceAiUserPreferencesResponse> {
		if (this.isCloud) {
			this.rejectManagedFields(
				update,
				InstanceAiSettingsService.CLOUD_MANAGED_PREFERENCE_FIELDS,
				'cloud',
			);
		} else if (this.aiService.isProxyEnabled()) {
			this.rejectManagedFields(
				update,
				InstanceAiSettingsService.PROXY_MANAGED_PREFERENCE_FIELDS,
				'proxy',
			);
		}
		const prefs: UserInstanceAiPreferences = { ...this.readUserPreferences(user) };
		if (update.credentialId !== undefined) prefs.credentialId = update.credentialId;
		if (update.modelName !== undefined) prefs.modelName = update.modelName;
		if (update.localGatewayDisabled !== undefined)
			prefs.localGatewayDisabled = update.localGatewayDisabled;
		await this.userService.updateSettings(user.id, { instanceAi: prefs });
		user.settings = { ...(user.settings ?? {}), instanceAi: prefs };
		return await this.getUserPreferences(user);
	}

	// ── Shared accessors ──────────────────────────────────────────────────

	/** List credentials the user can access that are usable as LLM providers. */
	async listModelCredentials(user: User): Promise<InstanceAiModelCredential[]> {
		if (this.aiService.isProxyEnabled()) return [];
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
		if (this.aiService.isProxyEnabled()) return [];
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

	async resolveN8nSandboxConfig(user: User): Promise<{ serviceUrl?: string; apiKey?: string }> {
		const { n8nSandboxServiceUrl, n8nSandboxServiceApiKey } = this.config;
		const credentialId = this.adminN8nSandboxCredentialId;
		if (!credentialId) {
			return {
				serviceUrl: n8nSandboxServiceUrl || undefined,
				apiKey: n8nSandboxServiceApiKey || undefined,
			};
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) {
			return {
				serviceUrl: n8nSandboxServiceUrl || undefined,
				apiKey: n8nSandboxServiceApiKey || undefined,
			};
		}

		const data = this.credentialsService.decrypt(credential, true);
		const headerName = typeof data.name === 'string' ? data.name.trim().toLowerCase() : '';
		const apiKey = typeof data.value === 'string' ? data.value : undefined;
		return {
			serviceUrl: n8nSandboxServiceUrl || undefined,
			apiKey: headerName === 'x-api-key' ? apiKey : n8nSandboxServiceApiKey || undefined,
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

	/** Whether the local gateway is disabled for a given user (admin override OR user preference). */
	async isLocalGatewayDisabledForUser(userId: string): Promise<boolean> {
		if (!this.enabled) return true;
		if (this.config.localGatewayDisabled) return true;
		const user = await this.userRepository.findOneBy({ id: userId });
		if (!user) return true;
		return this.readUserPreferences(user).localGatewayDisabled ?? false;
	}

	/** Whether the n8n Agent is enabled by the admin. */
	isAgentEnabled(): boolean {
		return this.enabled;
	}

	/** Whether the local gateway is disabled globally by the admin. */
	isLocalGatewayDisabled(): boolean {
		return this.config.localGatewayDisabled;
	}

	/** Whether Instance AI chat and main UI are enabled (settings always available when module loads). */
	isInstanceAiEnabled(): boolean {
		return this.enabled;
	}

	/** Resolve just the model name (e.g. 'claude-sonnet-4-20250514') for proxy routing. */
	async resolveModelName(user: User): Promise<string> {
		const prefs = this.readUserPreferences(user);
		return prefs.modelName || this.extractModelName(this.config.model);
	}

	/** Resolve the current model configuration for an agent run. */
	async resolveModelConfig(user: User): Promise<ModelConfig> {
		const prefs = this.readUserPreferences(user);
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

	/** Admin fields managed by the AI service proxy — not user-editable when proxy is active. */
	private static readonly PROXY_MANAGED_ADMIN_FIELDS: readonly string[] = [
		'sandboxEnabled',
		'sandboxProvider',
		'sandboxImage',
		'sandboxTimeout',
		'daytonaCredentialId',
		'searchCredentialId',
	];

	/** User preference fields managed by the AI service proxy. */
	private static readonly PROXY_MANAGED_PREFERENCE_FIELDS: readonly string[] = [
		'credentialId',
		'modelName',
	];

	/** Admin fields managed by the cloud platform — superset of proxy-managed fields. */
	private static readonly CLOUD_MANAGED_ADMIN_FIELDS: readonly string[] = [
		...InstanceAiSettingsService.PROXY_MANAGED_ADMIN_FIELDS,
		'n8nSandboxCredentialId',
		'lastMessages',
		'embedderModel',
		'semanticRecallTopK',
		'subAgentMaxSteps',
		'browserMcp',
		'mcpServers',
	];

	/** User preference fields managed by the cloud platform. */
	private static readonly CLOUD_MANAGED_PREFERENCE_FIELDS: readonly string[] = [
		...InstanceAiSettingsService.PROXY_MANAGED_PREFERENCE_FIELDS,
	];

	private rejectManagedFields(
		update: object,
		managedFields: readonly string[],
		label: string,
	): void {
		const record = update as Record<string, unknown>;
		const present = managedFields.filter((key) => key in record && record[key] !== undefined);
		if (present.length > 0) {
			throw new UnprocessableRequestError(
				`Cannot update ${label}-managed fields: ${present.join(', ')}`,
			);
		}
	}

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
		if (persisted.enabled !== undefined) this.enabled = persisted.enabled;
		if (persisted.lastMessages !== undefined) c.lastMessages = persisted.lastMessages;
		if (persisted.embedderModel !== undefined) c.embedderModel = persisted.embedderModel;
		if (persisted.semanticRecallTopK !== undefined)
			c.semanticRecallTopK = persisted.semanticRecallTopK;
		if (persisted.subAgentMaxSteps !== undefined) c.subAgentMaxSteps = persisted.subAgentMaxSteps;
		if (persisted.browserMcp !== undefined) c.browserMcp = persisted.browserMcp;
		if (persisted.permissions) {
			this.permissions = {
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				...persisted.permissions,
			};
		}
		if (persisted.mcpServers !== undefined) c.mcpServers = persisted.mcpServers;
		if (persisted.sandboxEnabled !== undefined) c.sandboxEnabled = persisted.sandboxEnabled;
		if (persisted.sandboxProvider !== undefined) c.sandboxProvider = persisted.sandboxProvider;
		if (persisted.sandboxImage !== undefined) c.sandboxImage = persisted.sandboxImage;
		if (persisted.sandboxTimeout !== undefined) c.sandboxTimeout = persisted.sandboxTimeout;
		if (persisted.daytonaCredentialId !== undefined)
			this.adminDaytonaCredentialId = persisted.daytonaCredentialId;
		if (persisted.n8nSandboxCredentialId !== undefined)
			this.adminN8nSandboxCredentialId = persisted.n8nSandboxCredentialId;
		if (persisted.searchCredentialId !== undefined)
			this.adminSearchCredentialId = persisted.searchCredentialId;
		if (persisted.localGatewayDisabled !== undefined)
			c.localGatewayDisabled = persisted.localGatewayDisabled;
		if (persisted.optinModalDismissed !== undefined)
			this.optinModalDismissed = persisted.optinModalDismissed;
	}

	private readUserPreferences(user: User): UserInstanceAiPreferences {
		return user.settings?.instanceAi ?? {};
	}

	private async persistAdminSettings(): Promise<void> {
		const c = this.config;
		const value: PersistedAdminSettings = {
			enabled: this.enabled,
			lastMessages: c.lastMessages,
			embedderModel: c.embedderModel,
			semanticRecallTopK: c.semanticRecallTopK,
			subAgentMaxSteps: c.subAgentMaxSteps,
			browserMcp: c.browserMcp,
			permissions: this.permissions,
			mcpServers: c.mcpServers,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider: c.sandboxProvider,
			sandboxImage: c.sandboxImage,
			sandboxTimeout: c.sandboxTimeout,
			daytonaCredentialId: this.adminDaytonaCredentialId,
			n8nSandboxCredentialId: this.adminN8nSandboxCredentialId,
			searchCredentialId: this.adminSearchCredentialId,
			localGatewayDisabled: c.localGatewayDisabled,
			optinModalDismissed: this.optinModalDismissed,
		};

		await this.settingsRepository.upsert(
			{ key: ADMIN_SETTINGS_KEY, value: JSON.stringify(value), loadOnStartup: true },
			['key'],
		);
	}
}

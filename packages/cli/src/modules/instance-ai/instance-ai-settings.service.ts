import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiModelCredential,
	InstanceAiPermissions,
	InstanceAiSandboxProvider,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig, DeploymentConfig } from '@n8n/config';
import { DbLock, DbLockService, Settings, SettingsRepository, UserRepository } from '@n8n/db';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';
import type { EntityManager } from '@n8n/typeorm';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { ICredentialDataDecryptedObject, IUserSettings } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import {
	InstanceCredentialBroker,
	type ResolvedInstanceCredential,
} from '@/credentials/instance-credential-broker';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { EventService } from '@/events/event.service';
import { AiService } from '@/services/ai.service';
import { UserService } from '@/services/user.service';

import {
	N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE,
	normalizeSandboxProvider,
} from './sandbox-provider';

const ADMIN_SETTINGS_KEY = 'instanceAi.settings';

type UserInstanceAiPreferences = NonNullable<IUserSettings['instanceAi']>;

export interface InstanceAiSandboxStatus {
	enabled: boolean;
	provider: InstanceAiSandboxProvider;
	workflowBuilderAvailable: boolean;
	unavailableReason: string | null;
}

/** Credential types we support and their model provider mapping. */
const CREDENTIAL_TO_MODEL_PROVIDER: Record<string, string> = {
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

export const INSTANCE_AI_MODEL_CREDENTIAL_POLICY = {
	id: 'instance-ai:model',
	credentialTypes: Object.keys(CREDENTIAL_TO_MODEL_PROVIDER),
};

export const INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY = {
	id: 'instance-ai:sandbox:daytona',
	credentialTypes: ['daytonaApi'],
};

export const INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY = {
	id: 'instance-ai:sandbox:n8n',
	credentialTypes: ['httpHeaderAuth'],
};

export const INSTANCE_AI_SEARCH_CREDENTIAL_POLICY = {
	id: 'instance-ai:search',
	credentialTypes: ['braveSearchApi', 'searXngApi'],
};

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

/** Admin settings stored in DB under ADMIN_SETTINGS_KEY. */
interface PersistedAdminSettings {
	enabled?: boolean;
	permissions?: Partial<InstanceAiPermissions>;
	mcpServers?: string;
	mcpAccessEnabled?: boolean;
	sandboxEnabled?: boolean;
	sandboxProvider?: string;
	sandboxImage?: string;
	sandboxTimeout?: number;
	localGatewayDisabled?: boolean;
	browserUseEnabled?: boolean;
}

@Service()
export class InstanceAiSettingsService {
	private readonly config: InstanceAiConfig;

	private readonly deploymentConfig: DeploymentConfig;

	/** Whether n8n Agent is enabled for this instance. */
	private enabled = true;

	/** Whether users may connect the AI Assistant to MCP servers from the registry. */
	private mcpAccessEnabled = true;

	/** Per-action HITL permission overrides. */
	private permissions: InstanceAiPermissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };

	constructor(
		globalConfig: GlobalConfig,
		private readonly dbLockService: DbLockService,
		private readonly settingsRepository: SettingsRepository,
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly aiService: AiService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly instanceCredentialBroker: InstanceCredentialBroker,
		private readonly eventService: EventService,
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
		this.config.sandboxProvider = normalizeSandboxProvider(this.config.sandboxProvider);
		const envSnapshot = {
			sandboxEnabled: this.config.sandboxEnabled,
			sandboxProvider: this.config.sandboxProvider,
		};

		await this.reloadFromDb();
		// Surface the effective sandbox config so operators (and CI) can tell whether env vars
		// or a persisted DB setting are in effect — these can silently disagree.
		const c = this.config;
		const overridden =
			c.sandboxEnabled !== envSnapshot.sandboxEnabled ||
			c.sandboxProvider !== envSnapshot.sandboxProvider;
		const logger = Container.get(Logger).scoped('instance-ai');
		logger.info(
			`Sandbox: enabled=${c.sandboxEnabled} provider=${c.sandboxProvider}` +
				(overridden
					? ` (DB override; env was enabled=${envSnapshot.sandboxEnabled} provider=${envSnapshot.sandboxProvider})`
					: ' (from env)'),
		);
		const sandboxStatus = this.getSandboxStatus();
		if (sandboxStatus.unavailableReason) {
			logger.warn(`Sandbox unavailable: ${sandboxStatus.unavailableReason}`);
		}
	}

	// ── Admin settings ────────────────────────────────────────────────────

	async getAdminSettings(): Promise<InstanceAiAdminSettingsResponse> {
		const c = this.config;
		const credentialIds: [string | null, string | null, string | null, string | null] =
			this.isCloud || this.aiService.isProxyEnabled()
				? [null, null, null, null]
				: await Promise.all([
						this.instanceCredentialBroker.getAssignedCredentialId(
							INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id,
						),
						this.instanceCredentialBroker.getAssignedCredentialId(
							INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY.id,
						),
						this.instanceCredentialBroker.getAssignedCredentialId(
							INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY.id,
						),
						this.instanceCredentialBroker.getAssignedCredentialId(
							INSTANCE_AI_SEARCH_CREDENTIAL_POLICY.id,
						),
					]);
		const [modelCredentialId, daytonaCredentialId, n8nSandboxCredentialId, searchCredentialId] =
			credentialIds;
		return {
			enabled: this.enabled,
			permissions: { ...this.permissions },
			mcpServers: c.mcpServers,
			mcpAccessEnabled: this.mcpAccessEnabled,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider: normalizeSandboxProvider(c.sandboxProvider),
			sandboxImage: c.sandboxImage,
			sandboxTimeout: c.sandboxTimeout,
			daytonaCredentialId,
			n8nSandboxCredentialId,
			searchCredentialId,
			modelCredentialId,
			localGatewayDisabled: this.isLocalGatewayDisabled(),
			browserUseEnabled: this.isBrowserUseEnabled(),
		};
	}

	async updateAdminSettings(
		update: InstanceAiAdminSettingsUpdateRequest,
	): Promise<InstanceAiAdminSettingsResponse> {
		this.rejectManagedFields(
			update,
			InstanceAiSettingsService.MANAGED_ADMIN_FIELDS,
			this.deploymentLabel(),
		);
		if (this.isCloud || this.aiService.isProxyEnabled()) {
			this.rejectManagedFields(
				update,
				InstanceAiSettingsService.INSTANCE_CREDENTIAL_FIELDS,
				this.deploymentLabel(),
			);
		}
		const {
			modelCredentialId,
			daytonaCredentialId,
			n8nSandboxCredentialId,
			searchCredentialId,
			...settingsUpdate
		} = update;
		const { previous, next } = await this.dbLockService.withLock(
			DbLock.INSTANCE_AI_SETTINGS,
			async (transactionManager) => {
				const current = this.mergeAdminSettings(
					this.snapshotAdminSettings(),
					await this.readPersistedAdminSettings(transactionManager),
				);
				this.validateAdminSettingsUpdate(settingsUpdate, current);
				if (modelCredentialId === null) {
					await this.instanceCredentialBroker.clearForUse(
						INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id,
						transactionManager,
					);
				} else if (modelCredentialId !== undefined) {
					const credential = await this.instanceCredentialBroker.assignForUse(
						INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id,
						modelCredentialId,
						transactionManager,
					);
					this.ensureCredentialMatchesConfiguredModel(credential.type);
				}
				await this.updateCredentialAssignment(
					INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY.id,
					daytonaCredentialId,
					transactionManager,
				);
				await this.updateCredentialAssignment(
					INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY.id,
					n8nSandboxCredentialId,
					transactionManager,
				);
				await this.updateCredentialAssignment(
					INSTANCE_AI_SEARCH_CREDENTIAL_POLICY.id,
					searchCredentialId,
					transactionManager,
				);

				const previous = this.snapshotAdminSettings();
				const next = this.mergeAdminSettings(current, settingsUpdate);
				await this.persistAdminSettings(next, transactionManager);
				return { previous, next };
			},
		);
		this.applyAdminSettings(next);
		this.emitSettingsUpdated(previous, next);

		return await this.getAdminSettings();
	}

	async reloadFromDb(): Promise<void> {
		const previous = this.snapshotAdminSettings();
		const persisted = await this.readPersistedAdminSettings();
		this.applyAdminSettings(persisted);
		this.emitSettingsUpdated(previous, this.snapshotAdminSettings());
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
		this.rejectManagedFields(
			update,
			InstanceAiSettingsService.MANAGED_PREFERENCE_FIELDS,
			this.deploymentLabel(),
		);
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
			.filter((c) => INSTANCE_AI_MODEL_CREDENTIAL_POLICY.credentialTypes.includes(c.type))
			.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
				provider: CREDENTIAL_TO_MODEL_PROVIDER[c.type] ?? 'custom',
			}));
	}

	async listInstanceModelCredentials(): Promise<InstanceAiModelCredential[]> {
		if (this.isCloud || this.aiService.isProxyEnabled()) return [];
		const instanceCredentials = await this.instanceCredentialBroker.listForUse(
			INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id,
		);
		return instanceCredentials.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
			provider: CREDENTIAL_TO_MODEL_PROVIDER[c.type] ?? 'custom',
		}));
	}

	/** List instance credentials usable as sandbox/search service credentials. */
	async listInstanceServiceCredentials(): Promise<InstanceAiModelCredential[]> {
		if (this.isCloud || this.aiService.isProxyEnabled()) return [];
		const credentials = await Promise.all([
			this.instanceCredentialBroker.listForUse(INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY.id),
			this.instanceCredentialBroker.listForUse(INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY.id),
			this.instanceCredentialBroker.listForUse(INSTANCE_AI_SEARCH_CREDENTIAL_POLICY.id),
		]);
		return credentials.flat().map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
			provider: c.type,
		}));
	}

	/** Resolve sandbox (Daytona) config from the admin-selected instance credential. */
	async resolveDaytonaConfig(): Promise<{ apiUrl?: string; apiKey?: string }> {
		const { daytonaApiUrl, daytonaApiKey } = this.config;
		const envConfig = {
			apiUrl: daytonaApiUrl || undefined,
			apiKey: daytonaApiKey || undefined,
		};
		const resolved = await this.resolveServiceCredential(
			INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
			'Daytona sandbox',
		);
		if (!resolved) return envConfig;
		const { data } = resolved;
		const apiUrl = typeof data.apiUrl === 'string' ? data.apiUrl : undefined;
		const apiKey = typeof data.apiKey === 'string' ? data.apiKey : undefined;
		if (!apiUrl || !apiKey) {
			this.warnCredentialFallback(
				'Daytona sandbox',
				INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY.id,
				'Credential data is incomplete',
			);
			return envConfig;
		}
		return { apiUrl, apiKey };
	}

	async resolveN8nSandboxConfig(): Promise<{ serviceUrl?: string; apiKey?: string }> {
		const { n8nSandboxServiceUrl, n8nSandboxServiceApiKey } = this.config;
		const envConfig = {
			serviceUrl: n8nSandboxServiceUrl || undefined,
			apiKey: n8nSandboxServiceApiKey || undefined,
		};
		const resolved = await this.resolveServiceCredential(
			INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
			'n8n Sandbox',
		);
		if (!resolved) return envConfig;

		const { data } = resolved;
		const headerName = typeof data.name === 'string' ? data.name.trim().toLowerCase() : '';
		const apiKey = typeof data.value === 'string' ? data.value : undefined;
		if (headerName !== 'x-api-key') {
			this.warnCredentialFallback(
				'n8n Sandbox',
				INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY.id,
				`Credential header must be "x-api-key" but is "${headerName || '(empty)'}"`,
			);
			return envConfig;
		}
		if (!apiKey) {
			this.warnCredentialFallback(
				'n8n Sandbox',
				INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY.id,
				'Credential data is incomplete',
			);
			return envConfig;
		}
		return { serviceUrl: n8nSandboxServiceUrl || undefined, apiKey };
	}

	/** Resolve search config from the admin-selected instance credential. */
	async resolveSearchConfig(): Promise<{ braveApiKey?: string; searxngUrl?: string }> {
		const { braveSearchApiKey, searxngUrl } = this.config;
		const envConfig = {
			braveApiKey: braveSearchApiKey || undefined,
			searxngUrl: searxngUrl || undefined,
		};
		const resolved = await this.resolveServiceCredential(
			INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
			'search',
		);
		if (!resolved) return envConfig;
		const { type, data } = resolved;
		if (type === 'braveSearchApi' && typeof data.apiKey === 'string' && data.apiKey) {
			return { braveApiKey: data.apiKey };
		}
		if (type === 'searXngApi' && typeof data.apiUrl === 'string' && data.apiUrl) {
			return { searxngUrl: data.apiUrl };
		}
		this.warnCredentialFallback(
			'search',
			INSTANCE_AI_SEARCH_CREDENTIAL_POLICY.id,
			'Credential data is incomplete',
		);
		return envConfig;
	}

	/** Resolve a service's instance credential; null means fall back to environment configuration. */
	private async resolveServiceCredential(
		policy: { id: string },
		service: string,
	): Promise<ResolvedInstanceCredential | null> {
		if (this.isCloud || this.aiService.isProxyEnabled()) return null;
		return await this.instanceCredentialBroker.resolveForUse(policy.id).catch((error: unknown) => {
			this.warnCredentialFallback(service, policy.id, ensureError(error).message);
			return null;
		});
	}

	private warnCredentialFallback(service: string, credentialUseId: string, reason: string): void {
		Container.get(Logger)
			.scoped('instance-ai')
			.warn(`Could not resolve the configured ${service} credential; using environment fallback`, {
				credentialUseId,
				error: reason,
			});
	}

	/** Return the current HITL permission map. */
	getPermissions(): InstanceAiPermissions {
		return { ...this.permissions };
	}

	/** Whether users may connect the AI Assistant to MCP servers from the registry. */
	isMcpAccessEnabled(): boolean {
		return this.mcpAccessEnabled;
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

	isBrowserUseEnabled(): boolean {
		return this.config.browserUseEnabled;
	}

	/** Whether workflow building can use the required sandbox workspace. */
	getSandboxStatus(): InstanceAiSandboxStatus {
		const provider = normalizeSandboxProvider(this.config.sandboxProvider);
		const unavailableReason = this.getSandboxUnavailableReason(
			this.config.sandboxEnabled,
			provider,
		);

		return {
			enabled: this.config.sandboxEnabled,
			provider,
			workflowBuilderAvailable: this.config.sandboxEnabled && unavailableReason === null,
			unavailableReason,
		};
	}

	/** Whether Instance AI chat and main UI are enabled (settings always available when module loads). */
	isInstanceAiEnabled(): boolean {
		return this.enabled;
	}

	/** Resolve just the model name (e.g. 'claude-sonnet-4-20250514') for proxy routing. */
	resolveModelName(user: User): string {
		const prefs = this.readUserPreferences(user);
		return prefs.modelName ?? this.extractModelName(this.config.model);
	}

	async resolveModelConfig(user: User): Promise<ModelConfig> {
		const prefs = this.readUserPreferences(user);
		const modelName = prefs.modelName ?? this.extractModelName(this.config.model);

		const adminModelConfig = await this.resolveAdminModelConfig(modelName);
		if (adminModelConfig) {
			return adminModelConfig;
		}

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

		return (
			(await this.buildModelConfigFromCredential(credential, modelName)) ?? this.envVarModelConfig()
		);
	}

	private async resolveAdminModelConfig(modelName: string): Promise<ModelConfig | null> {
		const resolved = await this.resolveServiceCredential(
			INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
			'model',
		);
		if (!resolved) return null;

		const config = this.buildModelConfig(resolved.type, resolved.data, modelName);
		if (!config) {
			this.warnCredentialFallback(
				'model',
				INSTANCE_AI_MODEL_CREDENTIAL_POLICY.id,
				'Credential data is incomplete',
			);
		}
		return config;
	}

	private ensureCredentialMatchesConfiguredModel(credentialType: string): void {
		const slash = this.config.model.indexOf('/');
		if (slash < 0) return;
		const configuredProvider = this.config.model.slice(0, slash);
		const credentialProvider = CREDENTIAL_TO_MODEL_PROVIDER[credentialType];
		if (credentialProvider !== configuredProvider) {
			throw new UnprocessableRequestError(
				`This credential is for "${credentialProvider}" but the configured model "${this.config.model}" requires a "${configuredProvider}" credential. Select a matching credential or set N8N_INSTANCE_AI_MODEL to a "${credentialProvider}" model.`,
			);
		}
	}

	private async buildModelConfigFromCredential(
		credential: CredentialsEntity,
		modelName: string,
	): Promise<ModelConfig | null> {
		const data = await this.credentialsService.decrypt(credential, true);
		return this.buildModelConfig(credential.type, data, modelName);
	}

	private buildModelConfig(
		credentialType: string,
		data: ICredentialDataDecryptedObject,
		modelName: string,
	): ModelConfig | null {
		const provider = CREDENTIAL_TO_MODEL_PROVIDER[credentialType];
		if (!provider) {
			return null;
		}

		const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';
		const urlField = URL_FIELD_MAP[credentialType];
		const rawUrl = urlField ? data[urlField] : undefined;
		const baseUrl = typeof rawUrl === 'string' ? rawUrl : '';
		const id: `${string}/${string}` = `${provider}/${modelName}`;

		if (baseUrl) {
			return { id, url: baseUrl, ...(apiKey ? { apiKey } : {}) };
		}

		if (apiKey) {
			return { id, url: '', apiKey };
		}

		return null;
	}

	// ── Private helpers ───────────────────────────────────────────────────

	/** Admin fields sourced from environment variables only. */
	private static readonly MANAGED_ADMIN_FIELDS: readonly string[] = [
		'mcpServers',
		'sandboxEnabled',
		'sandboxProvider',
		'sandboxImage',
		'sandboxTimeout',
	];

	private static readonly INSTANCE_CREDENTIAL_FIELDS: readonly string[] = [
		'modelCredentialId',
		'daytonaCredentialId',
		'n8nSandboxCredentialId',
		'searchCredentialId',
	];

	/** User preference fields sourced from environment variables only. */
	private static readonly MANAGED_PREFERENCE_FIELDS: readonly string[] = [
		'credentialId',
		'modelName',
	];

	private async updateCredentialAssignment(
		credentialUseId: string,
		credentialId: string | null | undefined,
		transactionManager: EntityManager,
	): Promise<void> {
		if (credentialId === undefined) return;
		if (credentialId === null) {
			await this.instanceCredentialBroker.clearForUse(credentialUseId, transactionManager);
		} else {
			await this.instanceCredentialBroker.assignForUse(
				credentialUseId,
				credentialId,
				transactionManager,
			);
		}
	}

	/** Label for the deployment surface that owns the env-managed config, used in error messages. */
	private deploymentLabel(): string {
		if (this.isCloud) return 'cloud';
		if (this.aiService.isProxyEnabled()) return 'proxy';
		return 'instance';
	}

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

	private validateAdminSettingsUpdate(
		update: InstanceAiAdminSettingsUpdateRequest,
		current: PersistedAdminSettings,
	): void {
		const touchesSandboxSettings =
			update.sandboxEnabled !== undefined ||
			update.sandboxProvider !== undefined ||
			update.sandboxImage !== undefined ||
			update.sandboxTimeout !== undefined;
		if (!touchesSandboxSettings) {
			return;
		}

		// `update.sandboxProvider` is already enum-validated by the request DTO; we only
		// need the resolved provider here to enforce the cross-field service-URL rule,
		// which spans the request body and env-backed config and can't live in the schema.
		const sandboxProvider = normalizeSandboxProvider(
			update.sandboxProvider ?? current.sandboxProvider,
		);
		const sandboxEnabled = update.sandboxEnabled ?? current.sandboxEnabled ?? false;
		const unavailableReason = this.getSandboxUnavailableReason(sandboxEnabled, sandboxProvider);
		if (unavailableReason) {
			throw new UnprocessableRequestError(unavailableReason);
		}
	}

	private getSandboxUnavailableReason(
		sandboxEnabled: boolean,
		sandboxProvider: InstanceAiSandboxProvider,
	): string | null {
		if (
			sandboxEnabled &&
			sandboxProvider === 'n8n-sandbox' &&
			this.config.n8nSandboxServiceUrl.trim().length === 0
		) {
			return N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE;
		}

		return null;
	}

	private envVarModelConfig(): ModelConfig {
		return this.envVarModelConfigForModel(this.config.model);
	}

	private envVarModelConfigForModel(model: string): ModelConfig {
		const { modelUrl, modelApiKey } = this.config;
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
		if (persisted.permissions) {
			this.permissions = {
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				...persisted.permissions,
			};
		}
		if (persisted.mcpServers !== undefined) c.mcpServers = persisted.mcpServers;
		if (persisted.mcpAccessEnabled !== undefined)
			this.mcpAccessEnabled = persisted.mcpAccessEnabled;
		if (persisted.sandboxEnabled !== undefined) c.sandboxEnabled = persisted.sandboxEnabled;
		if (persisted.sandboxProvider !== undefined)
			c.sandboxProvider = normalizeSandboxProvider(persisted.sandboxProvider);
		if (persisted.sandboxImage !== undefined) c.sandboxImage = persisted.sandboxImage;
		if (persisted.sandboxTimeout !== undefined) c.sandboxTimeout = persisted.sandboxTimeout;
		if (persisted.localGatewayDisabled !== undefined)
			c.localGatewayDisabled = persisted.localGatewayDisabled;
		if (persisted.browserUseEnabled !== undefined)
			c.browserUseEnabled = persisted.browserUseEnabled;
	}

	private readUserPreferences(user: User): UserInstanceAiPreferences {
		return user.settings?.instanceAi ?? {};
	}

	private snapshotAdminSettings(): PersistedAdminSettings {
		const c = this.config;
		return {
			enabled: this.enabled,
			permissions: this.permissions,
			mcpServers: c.mcpServers,
			mcpAccessEnabled: this.mcpAccessEnabled,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider: c.sandboxProvider,
			sandboxImage: c.sandboxImage,
			sandboxTimeout: c.sandboxTimeout,
			localGatewayDisabled: c.localGatewayDisabled,
			browserUseEnabled: c.browserUseEnabled,
		};
	}

	private mergeAdminSettings(
		base: PersistedAdminSettings,
		update: PersistedAdminSettings,
	): PersistedAdminSettings {
		return {
			...base,
			...update,
			permissions: update.permissions
				? { ...(base.permissions ?? DEFAULT_INSTANCE_AI_PERMISSIONS), ...update.permissions }
				: base.permissions,
		};
	}

	private async readPersistedAdminSettings(
		transactionManager?: EntityManager,
	): Promise<PersistedAdminSettings> {
		const row = await this.settingsRepository.findByKey(ADMIN_SETTINGS_KEY, transactionManager);
		if (!row) return {};
		const settings = jsonParse<
			PersistedAdminSettings & {
				modelCredentialId?: string | null;
				daytonaCredentialId?: string | null;
				n8nSandboxCredentialId?: string | null;
				searchCredentialId?: string | null;
			}
		>(row.value, { fallbackValue: {} });
		delete settings.modelCredentialId;
		delete settings.daytonaCredentialId;
		delete settings.n8nSandboxCredentialId;
		delete settings.searchCredentialId;
		return settings;
	}

	private emitSettingsUpdated(
		previous: PersistedAdminSettings,
		current: PersistedAdminSettings,
	): void {
		this.eventService.emit('instance-ai-settings-updated', {
			mcpSettingsChanged:
				current.mcpServers !== previous.mcpServers ||
				current.mcpAccessEnabled !== previous.mcpAccessEnabled,
		});
	}

	private async persistAdminSettings(
		value: PersistedAdminSettings,
		transactionManager: EntityManager,
	): Promise<void> {
		await transactionManager.upsert(
			Settings,
			{ key: ADMIN_SETTINGS_KEY, value: JSON.stringify(value), loadOnStartup: true },
			['key'],
		);
	}
}

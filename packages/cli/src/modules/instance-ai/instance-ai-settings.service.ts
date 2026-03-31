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
	InstanceAiPermissions,
} from '@n8n/api-types';
import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import type { ModelConfig } from '@n8n/instance-ai';
import { jsonParse } from 'n8n-workflow';

const ADMIN_SETTINGS_KEY = 'instanceAi.settings';
const USER_PREFERENCES_KEY_PREFIX = 'instanceAi.preferences.';

// ---------------------------------------------------------------------------
// Persisted shapes (no secrets — those come from env/config only)
// ---------------------------------------------------------------------------

/** Admin settings stored in DB under ADMIN_SETTINGS_KEY. */
interface PersistedAdminSettings {
	lastMessages?: number;
	embedderModel?: string;
	semanticRecallTopK?: number;
	subAgentMaxSteps?: number;
	browserMcp?: boolean;
	permissions?: Partial<InstanceAiPermissions>;
	mcpServers?: string;
	localGatewayDisabled?: boolean;
}

/** Per-user preferences stored under USER_PREFERENCES_KEY_PREFIX + userId. */
interface PersistedUserPreferences {
	localGatewayDisabled?: boolean;
}

@Service()
export class InstanceAiSettingsService {
	private readonly config: InstanceAiConfig;

	/** Per-action HITL permission overrides. */
	private permissions: InstanceAiPermissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };

	/** In-memory cache of per-user preferences keyed by userId. */
	private readonly userPreferences = new Map<string, PersistedUserPreferences>();

	constructor(
		globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
	) {
		this.config = globalConfig.instanceAi;
	}

	/** Load persisted settings from DB and apply to the singleton config. Call on module init. */
	async loadFromDb(): Promise<void> {
		const row = await this.settingsRepository.findByKey(ADMIN_SETTINGS_KEY);
		if (!row) return;

		const persisted = jsonParse<PersistedAdminSettings>(row.value, {
			fallbackValue: {},
		});
		this.applyAdminSettings(persisted);
	}

	// ── Admin settings ────────────────────────────────────────────────────

	getAdminSettings(): InstanceAiAdminSettingsResponse {
		const c = this.config;
		return {
			lastMessages: c.lastMessages,
			embedderModel: c.embedderModel,
			semanticRecallTopK: c.semanticRecallTopK,
			subAgentMaxSteps: c.subAgentMaxSteps,
			browserMcp: c.browserMcp,
			permissions: { ...this.permissions },
			mcpServers: c.mcpServers,
			localGatewayDisabled: this.isLocalGatewayDisabled(),
		};
	}

	async updateAdminSettings(
		update: InstanceAiAdminSettingsUpdateRequest,
	): Promise<InstanceAiAdminSettingsResponse> {
		const c = this.config;
		if (update.lastMessages !== undefined) c.lastMessages = update.lastMessages;
		if (update.embedderModel !== undefined) c.embedderModel = update.embedderModel;
		if (update.semanticRecallTopK !== undefined) c.semanticRecallTopK = update.semanticRecallTopK;
		if (update.subAgentMaxSteps !== undefined) c.subAgentMaxSteps = update.subAgentMaxSteps;
		if (update.browserMcp !== undefined) c.browserMcp = update.browserMcp;
		if (update.permissions) {
			this.permissions = { ...this.permissions, ...update.permissions };
		}
		if (update.mcpServers !== undefined) c.mcpServers = update.mcpServers;
		if (update.localGatewayDisabled !== undefined)
			c.localGatewayDisabled = update.localGatewayDisabled;
		await this.persistAdminSettings();
		return this.getAdminSettings();
	}

	// ── User preferences ──────────────────────────────────────────────────

	async getUserPreferences(user: User): Promise<InstanceAiUserPreferencesResponse> {
		const prefs = await this.loadUserPreferences(user.id);
		return {
			localGatewayDisabled:
				this.config.localGatewayDisabled || (prefs.localGatewayDisabled ?? false),
		};
	}

	async updateUserPreferences(
		user: User,
		update: InstanceAiUserPreferencesUpdateRequest,
	): Promise<InstanceAiUserPreferencesResponse> {
		const prefs = await this.loadUserPreferences(user.id);
		if (update.localGatewayDisabled !== undefined)
			prefs.localGatewayDisabled = update.localGatewayDisabled;
		this.userPreferences.set(user.id, prefs);
		await this.persistUserPreferences(user.id, prefs);
		return await this.getUserPreferences(user);
	}

	// ── Shared accessors ──────────────────────────────────────────────────

	/** Resolve sandbox (Daytona) config from env vars. */
	resolveDaytonaConfig(): { apiUrl?: string; apiKey?: string } {
		const { daytonaApiUrl, daytonaApiKey } = this.config;
		return {
			apiUrl: daytonaApiUrl || undefined,
			apiKey: daytonaApiKey || undefined,
		};
	}

	/** Resolve search config from env vars. */
	resolveSearchConfig(): { braveApiKey?: string; searxngUrl?: string } {
		const { braveSearchApiKey, searxngUrl } = this.config;
		return {
			braveApiKey: braveSearchApiKey || undefined,
			searxngUrl: searxngUrl || undefined,
		};
	}

	/** Return the current HITL permission map. */
	getPermissions(): InstanceAiPermissions {
		return { ...this.permissions };
	}

	/** Whether the local gateway is disabled for a given user (admin override OR user preference). */
	isLocalGatewayDisabledForUser(userId: string): boolean {
		if (this.config.localGatewayDisabled) return true;
		const prefs = this.userPreferences.get(userId);
		return prefs?.localGatewayDisabled ?? false;
	}

	/** Whether the local gateway is disabled globally by the admin. */
	isLocalGatewayDisabled(): boolean {
		return this.config.localGatewayDisabled;
	}

	/** Resolve just the model name (e.g. 'claude-sonnet-4-20250514') from config. */
	resolveModelName(): string {
		return this.extractModelName(this.config.model);
	}

	/** Resolve the current model configuration from env vars. */
	resolveModelConfig(): ModelConfig {
		return this.envVarModelConfig();
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
		if (persisted.localGatewayDisabled !== undefined)
			c.localGatewayDisabled = persisted.localGatewayDisabled;
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

		return {};
	}

	private async persistAdminSettings(): Promise<void> {
		const c = this.config;
		const value: PersistedAdminSettings = {
			lastMessages: c.lastMessages,
			embedderModel: c.embedderModel,
			semanticRecallTopK: c.semanticRecallTopK,
			subAgentMaxSteps: c.subAgentMaxSteps,
			browserMcp: c.browserMcp,
			permissions: this.permissions,
			mcpServers: c.mcpServers,
			localGatewayDisabled: c.localGatewayDisabled,
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

import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import { hasGlobalScope } from '@n8n/permissions';
import type {
	CreateCredentialDto,
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiConnectionUpdate,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiModelCredential,
	InstanceAiPermissions,
	InstanceAiSandboxProvider,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig, DeploymentConfig } from '@n8n/config';
import { DbLock, DbLockService, SettingsRepository, UserRepository } from '@n8n/db';
import type { CredentialsEntity, OperationContext, User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { ICredentialDataDecryptedObject, IUserSettings } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import {
	InstanceCredentialBroker,
	type InstanceCredentialUse,
	type ResolvedInstanceCredential,
} from '@/credentials/instance-credential-broker';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
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
	modelName?: string | null;
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

	private adminModelName: string | null = null;
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
		const isManaged = this.isCloud || this.aiService.isProxyEnabled();
		const credentialIds: [string | null, string | null, string | null, string | null] = isManaged
			? [null, null, null, null]
			: await Promise.all([
					this.instanceCredentialBroker.getAssignedCredentialId(
						INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
					),
					this.instanceCredentialBroker.getAssignedCredentialId(
						INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
					),
					this.instanceCredentialBroker.getAssignedCredentialId(
						INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
					),
					this.instanceCredentialBroker.getAssignedCredentialId(
						INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
					),
				]);
		const [modelCredentialId, daytonaCredentialId, n8nSandboxCredentialId, searchCredentialId] =
			credentialIds;
		const sandboxProvider = normalizeSandboxProvider(c.sandboxProvider);
		return {
			enabled: this.enabled,
			permissions: { ...this.permissions },
			mcpAccessEnabled: this.mcpAccessEnabled,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider,
			daytonaCredentialId,
			n8nSandboxCredentialId,
			searchCredentialId,
			modelCredentialId,
			modelName: isManaged ? null : this.adminModelName,
			modelEnvConfigured: Boolean(c.modelApiKey.trim() || c.modelUrl.trim()),
			// n8n-sandbox needs only the URL; the service accepts keyless clients.
			sandboxEnvConfigured:
				sandboxProvider === 'daytona'
					? Boolean(c.daytonaApiKey.trim())
					: Boolean(c.n8nSandboxServiceUrl.trim()),
			searchEnvConfigured: Boolean(c.braveSearchApiKey.trim() || c.searxngUrl.trim()),
			localGatewayDisabled: this.isLocalGatewayDisabled(),
			browserUseEnabled: this.isBrowserUseEnabled(),
		};
	}

	async updateAdminSettings(
		update: InstanceAiAdminSettingsUpdateRequest,
		user?: User,
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
			this.rejectManagedFields(update, ['modelName', 'sandboxProvider'], this.deploymentLabel());
		}
		let {
			// eslint-disable-next-line prefer-const
			modelCredentialId,
			daytonaCredentialId,
			n8nSandboxCredentialId,
			searchCredentialId,
			modelConnection,
			sandboxConnection,
			searchConnection,
			...settingsUpdate
		} = update;
		this.rejectConnectionConflicts(update);

		const replacedCredentialIds: string[] = [];
		if (
			modelConnection !== undefined ||
			sandboxConnection !== undefined ||
			searchConnection !== undefined
		) {
			if (!user || !hasGlobalScope(user, 'credential:manageInstance')) {
				throw new ForbiddenError('You do not have permission to manage provider connections');
			}
			if (modelConnection !== undefined) {
				modelCredentialId = await this.upsertConnection(
					user,
					INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
					'AI Assistant model',
					modelConnection,
					replacedCredentialIds,
				);
			}
			if (searchConnection !== undefined) {
				searchCredentialId = await this.upsertConnection(
					user,
					INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
					'AI Assistant web search',
					searchConnection,
					replacedCredentialIds,
				);
			}
			if (sandboxConnection !== undefined) {
				const sandbox = await this.upsertSandboxConnection(
					user,
					sandboxConnection,
					replacedCredentialIds,
				);
				daytonaCredentialId = sandbox.daytonaCredentialId;
				n8nSandboxCredentialId = sandbox.n8nSandboxCredentialId;
				if (sandbox.sandboxProvider) settingsUpdate.sandboxProvider = sandbox.sandboxProvider;
			}
		}
		const { previous, next } = await this.dbLockService.withLockContext(
			DbLock.INSTANCE_AI_SETTINGS,
			async (ctx) => {
				const updateCredentialAssignment = async (
					credentialUse: InstanceCredentialUse,
					credentialId: string | null | undefined,
				) => {
					if (credentialId === undefined) return;
					if (credentialId === null) {
						await this.instanceCredentialBroker.clearForUse(credentialUse, ctx);
					} else {
						await this.instanceCredentialBroker.assignForUse(credentialUse, credentialId, ctx);
					}
				};
				const persisted = await this.settingsRepository.findByKeyInContext(ADMIN_SETTINGS_KEY, ctx);
				const current = this.mergeAdminSettings(
					this.snapshotAdminSettings(),
					this.parsePersistedAdminSettings(persisted?.value),
				);
				const currentModelCredentialId =
					await this.instanceCredentialBroker.getAssignedCredentialId(
						INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
						ctx,
					);
				const previous = this.snapshotAdminSettings();
				const next = this.mergeAdminSettings(current, settingsUpdate);

				const nextModelCredentialId =
					modelCredentialId === undefined ? currentModelCredentialId : modelCredentialId;
				const nextModelName =
					settingsUpdate.modelName !== undefined
						? settingsUpdate.modelName
						: modelCredentialId === null
							? null
							: current.modelName;
				if (modelCredentialId !== undefined || settingsUpdate.modelName !== undefined) {
					const hasCredential =
						nextModelCredentialId !== null && nextModelCredentialId !== undefined;
					const hasModelName = nextModelName !== null && nextModelName !== undefined;
					if (hasCredential && !hasModelName) {
						throw new UnprocessableRequestError(
							'modelName must be set together with modelCredentialId',
						);
					}
					if (hasModelName && !hasCredential) {
						throw new UnprocessableRequestError('modelName requires modelCredentialId');
					}
				}
				next.modelName = nextModelName ?? null;

				await updateCredentialAssignment(INSTANCE_AI_MODEL_CREDENTIAL_POLICY, modelCredentialId);
				await updateCredentialAssignment(
					INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
					daytonaCredentialId,
				);
				await updateCredentialAssignment(
					INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
					n8nSandboxCredentialId,
				);
				if (typeof n8nSandboxCredentialId === 'string') {
					await this.validateN8nSandboxCredential(ctx);
				}
				await updateCredentialAssignment(INSTANCE_AI_SEARCH_CREDENTIAL_POLICY, searchCredentialId);
				await this.settingsRepository.upsertByKey(
					ADMIN_SETTINGS_KEY,
					JSON.stringify(next),
					true,
					ctx,
				);
				return { previous, next };
			},
		);
		this.applyAdminSettings(next);
		this.emitSettingsUpdated(previous, next);
		if (user && replacedCredentialIds.length > 0) {
			await this.deleteReplacedCredentials(user, replacedCredentialIds);
		}

		return await this.getAdminSettings();
	}

	/** Connection payloads and raw credential-id fields are mutually exclusive per use. */
	private rejectConnectionConflicts(update: InstanceAiAdminSettingsUpdateRequest): void {
		const conflicts: Array<[string, string, boolean]> = [
			['modelConnection', 'modelCredentialId', update.modelCredentialId !== undefined],
			['sandboxConnection', 'daytonaCredentialId', update.daytonaCredentialId !== undefined],
			['sandboxConnection', 'n8nSandboxCredentialId', update.n8nSandboxCredentialId !== undefined],
			['searchConnection', 'searchCredentialId', update.searchCredentialId !== undefined],
		];
		for (const [connectionField, idField, idPresent] of conflicts) {
			const connectionPresent = (update as Record<string, unknown>)[connectionField] !== undefined;
			if (connectionPresent && idPresent) {
				throw new UnprocessableRequestError(
					`Cannot combine ${connectionField} with ${idField} in one update`,
				);
			}
		}
	}

	/**
	 * Creates or replaces the single credential behind a connection. Returns the
	 * credential id to assign (null clears). A replaced credential is deleted
	 * after the settings transaction commits, once its assignment is re-pointed.
	 */
	private async upsertConnection(
		user: User,
		policy: InstanceCredentialUse,
		name: string,
		connection: InstanceAiConnectionUpdate | null,
		replacedCredentialIds: string[],
	): Promise<string | null> {
		const current = await this.instanceCredentialBroker
			.resolveForUse(policy)
			.catch(() => null as ResolvedInstanceCredential | null);

		if (connection === null) {
			if (current) replacedCredentialIds.push(current.id);
			return null;
		}

		if (!policy.credentialTypes.includes(connection.type)) {
			throw new UnprocessableRequestError(
				`Connection type "${connection.type}" is not supported for "${policy.id}"`,
			);
		}

		const data = connection.data as ICredentialDataDecryptedObject;
		if (current && current.type === connection.type) {
			const entity = await this.credentialsFinderService.findCredentialForUser(
				current.id,
				user,
				['credential:update'],
				{ includeInstanceCredentials: true },
			);
			if (!entity) {
				throw new ForbiddenError('You do not have permission to update this provider connection');
			}
			const prepared = await this.credentialsService.prepareUpdateData(
				user,
				{ name: entity.name, type: entity.type, data },
				entity,
			);
			const encrypted = await this.credentialsService.createEncryptedData({
				id: entity.id,
				name: prepared.name,
				type: prepared.type,
				data: prepared.data as unknown as ICredentialDataDecryptedObject,
			});
			await this.credentialsService.update(
				entity.id,
				encrypted,
				prepared.data as unknown as ICredentialDataDecryptedObject,
			);
			return entity.id;
		}

		const dto: CreateCredentialDto = {
			name,
			type: connection.type,
			data: connection.data,
			availability: 'instance',
		};
		const created = await this.credentialsService.createUnmanagedCredential(dto, user);
		if (current) replacedCredentialIds.push(current.id);
		return created.id;
	}

	/** The sandbox connection type picks the provider; the other slot is cleared. */
	private async upsertSandboxConnection(
		user: User,
		connection: InstanceAiConnectionUpdate | null,
		replacedCredentialIds: string[],
	): Promise<{
		daytonaCredentialId: string | null;
		n8nSandboxCredentialId: string | null;
		sandboxProvider?: InstanceAiSandboxProvider;
	}> {
		const name = 'AI Assistant sandbox';
		if (connection === null) {
			return {
				daytonaCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
					name,
					null,
					replacedCredentialIds,
				),
				n8nSandboxCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
					name,
					null,
					replacedCredentialIds,
				),
			};
		}
		if (connection.type === 'daytonaApi') {
			return {
				daytonaCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
					name,
					connection,
					replacedCredentialIds,
				),
				n8nSandboxCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
					name,
					null,
					replacedCredentialIds,
				),
				sandboxProvider: 'daytona',
			};
		}
		if (connection.type === 'httpHeaderAuth') {
			const headerName =
				typeof connection.data.name === 'string' ? connection.data.name.trim().toLowerCase() : '';
			if (headerName !== 'x-api-key') {
				throw new UnprocessableRequestError(
					`The credential's header name must be "x-api-key" but is "${headerName || '(empty)'}"`,
				);
			}
			return {
				n8nSandboxCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
					name,
					connection,
					replacedCredentialIds,
				),
				daytonaCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
					name,
					null,
					replacedCredentialIds,
				),
				sandboxProvider: 'n8n-sandbox',
			};
		}
		throw new UnprocessableRequestError(
			`Connection type "${connection.type}" is not supported for the sandbox`,
		);
	}

	/** Best-effort: the replaced credential is already unassigned; an orphan is invisible but logged. */
	private async deleteReplacedCredentials(user: User, credentialIds: string[]): Promise<void> {
		for (const credentialId of credentialIds) {
			try {
				await this.credentialsService.delete(user, credentialId, {
					includeInstanceCredentials: true,
				});
			} catch (error) {
				Container.get(Logger)
					.scoped('instance-ai')
					.warn('Failed to delete a replaced provider connection credential', {
						credentialId,
						error: ensureError(error).message,
					});
			}
		}
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

	async listInstanceModelCredentials(): Promise<InstanceAiModelCredential[]> {
		if (this.isCloud || this.aiService.isProxyEnabled()) return [];
		const instanceCredentials = await this.instanceCredentialBroker.listForUse(
			INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
		);
		return instanceCredentials.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
			provider: CREDENTIAL_TO_MODEL_PROVIDER[c.type] ?? 'custom',
		}));
	}

	async listInstanceServiceCredentials(): Promise<InstanceAiModelCredential[]> {
		if (this.isCloud || this.aiService.isProxyEnabled()) return [];
		const credentials = await Promise.all([
			this.instanceCredentialBroker.listForUse(INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY),
			this.instanceCredentialBroker.listForUse(INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY),
			this.instanceCredentialBroker.listForUse(INSTANCE_AI_SEARCH_CREDENTIAL_POLICY),
		]);
		return credentials.flat().map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
			provider: c.type,
		}));
	}

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

	/** The sandbox client sends the key as `x-api-key`; any other header silently fails at runtime. */
	private async validateN8nSandboxCredential(ctx: OperationContext): Promise<void> {
		const resolved = await this.instanceCredentialBroker.resolveForUse(
			INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
			ctx,
		);
		if (!resolved) return;
		const headerName =
			typeof resolved.data.name === 'string' ? resolved.data.name.trim().toLowerCase() : '';
		if (headerName !== 'x-api-key') {
			throw new UnprocessableRequestError(
				`The credential's header name must be "x-api-key" but is "${headerName || '(empty)'}"`,
			);
		}
	}

	private async resolveServiceCredential(
		policy: InstanceCredentialUse,
		service: string,
	): Promise<ResolvedInstanceCredential | null> {
		if (this.isCloud || this.aiService.isProxyEnabled()) return null;
		return await this.instanceCredentialBroker.resolveForUse(policy).catch((error: unknown) => {
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
		const adminModelName =
			this.isCloud || this.aiService.isProxyEnabled() ? null : this.adminModelName;
		return adminModelName ?? prefs.modelName ?? this.extractModelName(this.config.model);
	}

	async resolveModelConfig(user: User): Promise<ModelConfig> {
		const prefs = this.readUserPreferences(user);
		const fallbackModelName = prefs.modelName ?? this.extractModelName(this.config.model);

		const adminModelConfig = this.adminModelName
			? await this.resolveAdminModelConfig(this.adminModelName)
			: null;
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
			(await this.buildModelConfigFromCredential(credential, fallbackModelName)) ??
			this.envVarModelConfig()
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

	/**
	 * Admin fields sourced from environment variables only. Direct self-hosted
	 * deployments may update instance credential assignments, the model name,
	 * and the sandbox provider (env value acts as the default).
	 */
	private static readonly MANAGED_ADMIN_FIELDS: readonly string[] = [
		'mcpServers',
		'sandboxEnabled',
		'sandboxImage',
		'sandboxTimeout',
	];

	private static readonly INSTANCE_CREDENTIAL_FIELDS: readonly string[] = [
		'modelCredentialId',
		'daytonaCredentialId',
		'n8nSandboxCredentialId',
		'searchCredentialId',
		'modelConnection',
		'sandboxConnection',
		'searchConnection',
	];

	/** User preference fields sourced from environment variables only. */
	private static readonly MANAGED_PREFERENCE_FIELDS: readonly string[] = [
		'credentialId',
		'modelName',
	];

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
		if (persisted.modelName !== undefined) this.adminModelName = persisted.modelName;
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
			modelName: this.adminModelName,
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

	private async readPersistedAdminSettings(): Promise<PersistedAdminSettings> {
		const row = await this.settingsRepository.findByKey(ADMIN_SETTINGS_KEY);
		return this.parsePersistedAdminSettings(row?.value);
	}

	private parsePersistedAdminSettings(value: string | undefined): PersistedAdminSettings {
		if (value === undefined) return {};
		const settings = jsonParse<
			PersistedAdminSettings & {
				modelCredentialId?: string | null;
				daytonaCredentialId?: string | null;
				n8nSandboxCredentialId?: string | null;
				searchCredentialId?: string | null;
			}
		>(value, { fallbackValue: {} });
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
}

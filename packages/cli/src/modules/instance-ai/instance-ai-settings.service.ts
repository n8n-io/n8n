import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	INSTANCE_AI_MODEL_CREDENTIAL_TYPES,
	INSTANCE_AI_SEARCH_CREDENTIAL_TYPES,
} from '@n8n/api-types';
import type {
	CreateCredentialDto,
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiConnectionUpdate,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiProviderConnection,
	InstanceAiPermissions,
	InstanceAiSandboxProvider,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig, DeploymentConfig } from '@n8n/config';
import { DbLock, DbLockService, SettingsRepository, UserRepository } from '@n8n/db';
import type { CredentialsEntity, ICredentialsDb, OperationContext, User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { ModelConfig } from '@n8n/instance-ai';
import { hasGlobalScope } from '@n8n/permissions';
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
import { ConflictError } from '@/errors/response-errors/conflict.error';
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
const N8N_SANDBOX_HEADER_NAME = 'x-api-key';

const MODEL_PROVIDER_API_KEY_ENV: ReadonlyMap<string, string> = new Map([
	['anthropic', 'ANTHROPIC_API_KEY'],
	['cohere', 'COHERE_API_KEY'],
	['deepseek', 'DEEPSEEK_API_KEY'],
	['google', 'GOOGLE_GENERATIVE_AI_API_KEY'],
	['groq', 'GROQ_API_KEY'],
	['mistral', 'MISTRAL_API_KEY'],
	['openai', 'OPENAI_API_KEY'],
	['openrouter', 'OPENROUTER_API_KEY'],
	['xai', 'XAI_API_KEY'],
]);

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
	groqApi: 'groq',
	deepSeekApi: 'deepseek',
	mistralCloudApi: 'mistral',
	xAiApi: 'xai',
	openRouterApi: 'openrouter',
	cohereApi: 'cohere',
} satisfies Record<(typeof INSTANCE_AI_MODEL_CREDENTIAL_TYPES)[number], string>;

/** Fields that contain the base URL per credential type. */
const URL_FIELD_MAP: Record<string, string> = {
	openAiApi: 'url',
	anthropicApi: 'url',
	googlePalmApi: 'host',
};

function requireConnectionValue(
	type: string,
	data: ICredentialDataDecryptedObject,
	field: string,
): string {
	const value = data[field];
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new UnprocessableRequestError(
			`The field "${field}" is required for provider connection type "${type}"`,
		);
	}
	return value.trim();
}

function requireHttpUrl(type: string, data: ICredentialDataDecryptedObject, field: string): void {
	const value = requireConnectionValue(type, data, field);
	try {
		const url = new URL(value);
		if (url.protocol === 'http:' || url.protocol === 'https:') return;
	} catch {}
	throw new UnprocessableRequestError(
		`The field "${field}" must be a valid HTTP URL for provider connection type "${type}"`,
	);
}

function validateModelCredential({
	type,
	data,
}: {
	type: string;
	data: ICredentialDataDecryptedObject;
}): void {
	const apiKey = data.apiKey;
	if (typeof apiKey === 'string' && apiKey.trim().length > 0) return;
	const urlField = URL_FIELD_MAP[type];
	const url = urlField === undefined ? undefined : data[urlField];
	if (typeof url === 'string' && url.trim().length > 0) return;
	throw new UnprocessableRequestError(
		urlField === undefined
			? `The field "apiKey" is required for provider connection type "${type}"`
			: `The field "apiKey" or "${urlField}" is required for provider connection type "${type}"`,
	);
}

function modelCredentialHeaders(
	credentialType: string,
	data: ICredentialDataDecryptedObject,
): Record<string, string> | undefined {
	const headers: Record<string, string> = {};
	if (credentialType === 'openAiApi' && typeof data.organizationId === 'string') {
		const organizationId = data.organizationId.trim();
		if (organizationId) headers['OpenAI-Organization'] = organizationId;
	}
	if (
		(credentialType === 'openAiApi' || credentialType === 'anthropicApi') &&
		data.header === true &&
		typeof data.headerName === 'string' &&
		typeof data.headerValue === 'string'
	) {
		const headerName = data.headerName.trim();
		if (headerName) headers[headerName] = data.headerValue;
	}
	return Object.keys(headers).length ? headers : undefined;
}

function validateSandboxServiceCredential({
	type,
	data,
}: {
	type: string;
	data: ICredentialDataDecryptedObject;
}): void {
	const headerName = requireConnectionValue(type, data, 'name').toLowerCase();
	if (headerName !== N8N_SANDBOX_HEADER_NAME) {
		throw new UnprocessableRequestError(
			`The credential's header name must be "${N8N_SANDBOX_HEADER_NAME}" but is "${headerName}"`,
		);
	}
	requireConnectionValue(type, data, 'value');
}

export const INSTANCE_AI_MODEL_CREDENTIAL_POLICY: InstanceCredentialUse = {
	id: 'instance-ai:model',
	credentialTypes: INSTANCE_AI_MODEL_CREDENTIAL_TYPES,
	validate: validateModelCredential,
};

export const INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY: InstanceCredentialUse = {
	id: 'instance-ai:sandbox:daytona',
	credentialTypes: ['daytonaApi'],
	validate: ({ type, data }) => {
		requireHttpUrl(type, data, 'apiUrl');
		requireConnectionValue(type, data, 'apiKey');
	},
};

export const INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY: InstanceCredentialUse = {
	id: 'instance-ai:sandbox:n8n',
	credentialTypes: ['httpHeaderAuth'],
	validate: validateSandboxServiceCredential,
};

export const INSTANCE_AI_SEARCH_CREDENTIAL_POLICY: InstanceCredentialUse = {
	id: 'instance-ai:search',
	credentialTypes: INSTANCE_AI_SEARCH_CREDENTIAL_TYPES,
	validate: ({ type, data }) => {
		if (type === 'searXngApi') requireHttpUrl(type, data, 'apiUrl');
		else requireConnectionValue(type, data, 'apiKey');
	},
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

interface PreparedConnection {
	event: 'create' | 'update';
	expectedCredentialId: string | null;
	credential: {
		id: string | null;
		name: string;
		type: string;
		data: ICredentialDataDecryptedObject;
	};
	encryptedData?: ICredentialsDb;
}

@Service()
export class InstanceAiSettingsService {
	private readonly config: InstanceAiConfig;

	private readonly deploymentConfig: DeploymentConfig;

	private readonly environmentSandboxProvider: InstanceAiSandboxProvider;

	private sandboxProviderOverride?: InstanceAiSandboxProvider;

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
		this.environmentSandboxProvider = normalizeSandboxProvider(this.config.sandboxProvider);
		this.config.sandboxProvider = this.environmentSandboxProvider;
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
		const modelProviderApiKeyEnv = MODEL_PROVIDER_API_KEY_ENV.get(c.model.split('/', 1)[0] ?? '');
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
		const modelName = isManaged ? null : this.adminModelName;
		return {
			enabled: this.enabled,
			permissions: { ...this.permissions },
			mcpAccessEnabled: this.mcpAccessEnabled,
			sandboxEnabled: c.sandboxEnabled,
			sandboxProvider,
			daytonaCredentialId,
			n8nSandboxCredentialId,
			searchCredentialId,
			// A legacy assignment without a model name reads as unconfigured, matching runtime.
			modelCredentialId: modelName === null ? null : modelCredentialId,
			modelName,
			modelEnvConfigured: Boolean(
				c.modelApiKey.trim() ||
					c.modelUrl.trim() ||
					(modelProviderApiKeyEnv && process.env[modelProviderApiKeyEnv]?.trim()),
			),
			// n8n-sandbox needs only the URL; the service accepts keyless clients.
			sandboxEnvConfigured:
				this.environmentSandboxProvider === 'daytona'
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
		const {
			modelCredentialId: initialModelCredentialId,
			daytonaCredentialId: initialDaytonaCredentialId,
			n8nSandboxCredentialId: initialN8nSandboxCredentialId,
			searchCredentialId: initialSearchCredentialId,
			modelConnection,
			sandboxConnection,
			searchConnection,
			...settingsUpdate
		} = update;
		let modelCredentialId = initialModelCredentialId;
		let daytonaCredentialId = initialDaytonaCredentialId;
		let n8nSandboxCredentialId = initialN8nSandboxCredentialId;
		let searchCredentialId = initialSearchCredentialId;
		this.rejectConnectionConflicts(update);

		if (
			modelConnection !== undefined ||
			sandboxConnection !== undefined ||
			searchConnection !== undefined
		) {
			if (!user || !hasGlobalScope(user, 'credential:manageInstance')) {
				throw new ForbiddenError('You do not have permission to manage provider connections');
			}
		}
		if (modelConnection && (settingsUpdate.modelName ?? this.adminModelName) === null) {
			throw new UnprocessableRequestError('modelName must be set together with modelCredentialId');
		}
		const [modelPrepared, searchPrepared, sandboxPrepared] = user
			? await Promise.all([
					this.prepareConnection(
						INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
						'AI Assistant model',
						modelConnection,
					),
					this.prepareConnection(
						INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
						'AI Assistant web search',
						searchConnection,
					),
					this.prepareSandboxConnection(sandboxConnection),
				])
			: [undefined, undefined, undefined];
		await this.runConnectionHooks([modelPrepared, searchPrepared, sandboxPrepared]);
		const { previous, next } = await this.dbLockService.withLockContext(
			DbLock.INSTANCE_AI_SETTINGS,
			async (ctx) => {
				if (user && modelConnection !== undefined) {
					modelCredentialId = await this.upsertConnection(
						user,
						INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
						'AI Assistant model',
						modelConnection,
						ctx,
						modelPrepared,
					);
				}
				if (user && searchConnection !== undefined) {
					searchCredentialId = await this.upsertConnection(
						user,
						INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
						'AI Assistant web search',
						searchConnection,
						ctx,
						searchPrepared,
					);
				}
				if (user && sandboxConnection !== undefined) {
					const sandbox = await this.upsertSandboxConnection(
						user,
						sandboxConnection,
						ctx,
						sandboxPrepared,
					);
					daytonaCredentialId = sandbox.daytonaCredentialId;
					n8nSandboxCredentialId = sandbox.n8nSandboxCredentialId;
					if (sandbox.sandboxProvider) settingsUpdate.sandboxProvider = sandbox.sandboxProvider;
				}

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
				const clearsSandboxConnection =
					sandboxConnection === null ||
					(daytonaCredentialId === null && n8nSandboxCredentialId === null);
				this.validateAdminSettingsUpdate(
					update,
					current,
					clearsSandboxConnection
						? this.environmentSandboxProvider
						: settingsUpdate.sandboxProvider,
				);
				const currentModelCredentialId =
					await this.instanceCredentialBroker.getAssignedCredentialId(
						INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
						ctx,
					);
				const previous = this.snapshotAdminSettings();
				const next = this.mergeAdminSettings(current, settingsUpdate);
				if (clearsSandboxConnection) delete next.sandboxProvider;

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
				await updateCredentialAssignment(INSTANCE_AI_SEARCH_CREDENTIAL_POLICY, searchCredentialId);
				if (typeof modelCredentialId === 'string') {
					await this.validateAssignedServiceCredential(INSTANCE_AI_MODEL_CREDENTIAL_POLICY, ctx);
				}
				if (typeof daytonaCredentialId === 'string') {
					await this.validateAssignedServiceCredential(INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY, ctx);
				}
				if (typeof n8nSandboxCredentialId === 'string') {
					await this.validateAssignedServiceCredential(
						INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
						ctx,
					);
				}
				if (typeof searchCredentialId === 'string') {
					await this.validateAssignedServiceCredential(INSTANCE_AI_SEARCH_CREDENTIAL_POLICY, ctx);
				}
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
	 * Creates or updates the credential behind a connection. Returns the credential
	 * id to assign (null clears). Credential rows remain reusable when an assignment
	 * is replaced or cleared.
	 */
	private async upsertConnection(
		user: User,
		policy: InstanceCredentialUse,
		name: string,
		connection: InstanceAiConnectionUpdate | null,
		ctx: OperationContext,
		prepared?: PreparedConnection,
	): Promise<string | null> {
		if (connection === null) return null;
		if (!prepared?.encryptedData) throw new ConflictError('Provider connection changed; retry');

		// A current assignment outside the allowed types (legacy data) is replaced, not fatal.
		let current: ResolvedInstanceCredential | null;
		try {
			current = await this.instanceCredentialBroker.resolveForUse(policy, ctx);
		} catch (error) {
			if (!(error instanceof UnprocessableRequestError)) throw error;
			current = null;
		}

		if ((current?.id ?? null) !== prepared.expectedCredentialId) {
			throw new ConflictError('Provider connection changed; retry');
		}

		const data = connection.data as ICredentialDataDecryptedObject;
		if (current && current.type === connection.type) {
			await this.credentialsService.updateInstanceCredential(
				user,
				current.id,
				{ name: current.name, type: current.type, data },
				ctx,
				{ skipExternalHooks: true, encryptedData: prepared.encryptedData },
			);
			return current.id;
		}

		const dto: CreateCredentialDto = {
			name,
			type: connection.type,
			data: connection.data,
			availability: 'instance',
		};
		const created = await this.credentialsService.createInstanceCredential(dto, user, ctx, {
			skipExternalHooks: true,
			encryptedData: prepared.encryptedData,
		});
		return created.id;
	}

	private async prepareConnection(
		policy: InstanceCredentialUse,
		name: string,
		connection: InstanceAiConnectionUpdate | null | undefined,
	): Promise<PreparedConnection | undefined> {
		if (!connection) return undefined;
		if (!policy.credentialTypes.includes(connection.type)) {
			throw new UnprocessableRequestError(
				`Connection type "${connection.type}" is not supported for "${policy.id}"`,
			);
		}

		let current: ResolvedInstanceCredential | null;
		try {
			current = await this.instanceCredentialBroker.resolveForUse(policy);
		} catch (error) {
			if (!(error instanceof UnprocessableRequestError)) throw error;
			current = null;
		}

		const data = connection.data as ICredentialDataDecryptedObject;
		policy.validate?.({ type: connection.type, data });
		const existing =
			current?.type === connection.type ? { id: current.id, name: current.name } : null;
		return {
			event: existing ? 'update' : 'create',
			expectedCredentialId: current?.id ?? null,
			credential: {
				id: existing?.id ?? null,
				name: existing?.name ?? name,
				type: connection.type,
				data,
			},
		};
	}

	private async prepareSandboxConnection(
		connection: InstanceAiConnectionUpdate | null | undefined,
	): Promise<PreparedConnection | undefined> {
		if (!connection) return undefined;
		const policy =
			connection.type === 'daytonaApi'
				? INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY
				: connection.type === 'httpHeaderAuth'
					? INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY
					: undefined;
		if (!policy) {
			throw new UnprocessableRequestError(
				`Connection type "${connection.type}" is not supported for the sandbox`,
			);
		}
		return await this.prepareConnection(policy, 'AI Assistant sandbox', connection);
	}

	private async runConnectionHooks(
		preparedConnections: Array<PreparedConnection | undefined>,
	): Promise<void> {
		for (const prepared of preparedConnections) {
			if (prepared) {
				prepared.encryptedData = await this.credentialsService.runInstanceCredentialHooks(
					prepared.event,
					prepared.credential,
				);
			}
		}
	}

	/** The sandbox connection type picks the provider; the other slot is cleared. */
	private async upsertSandboxConnection(
		user: User,
		connection: InstanceAiConnectionUpdate | null,
		ctx: OperationContext,
		prepared?: PreparedConnection,
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
					ctx,
				),
				n8nSandboxCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
					name,
					null,
					ctx,
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
					ctx,
					prepared,
				),
				n8nSandboxCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
					name,
					null,
					ctx,
				),
				sandboxProvider: 'daytona',
			};
		}
		if (connection.type === 'httpHeaderAuth') {
			return {
				n8nSandboxCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY,
					name,
					connection,
					ctx,
					prepared,
				),
				daytonaCredentialId: await this.upsertConnection(
					user,
					INSTANCE_AI_DAYTONA_CREDENTIAL_POLICY,
					name,
					null,
					ctx,
				),
				sandboxProvider: 'n8n-sandbox',
			};
		}
		throw new UnprocessableRequestError(
			`Connection type "${connection.type}" is not supported for the sandbox`,
		);
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

	async listInstanceModelCredentials(): Promise<InstanceAiProviderConnection[]> {
		if (this.isCloud || this.aiService.isProxyEnabled()) return [];
		const instanceCredentials = await this.instanceCredentialBroker.listForUse(
			INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
		);
		return instanceCredentials.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
		}));
	}

	async listInstanceServiceCredentials(): Promise<InstanceAiProviderConnection[]> {
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
		if (headerName !== N8N_SANDBOX_HEADER_NAME) {
			this.warnCredentialFallback(
				'n8n Sandbox',
				INSTANCE_AI_N8N_SANDBOX_CREDENTIAL_POLICY.id,
				`Credential header must be "${N8N_SANDBOX_HEADER_NAME}" but is "${headerName || '(empty)'}"`,
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

	private async validateAssignedServiceCredential(
		policy: InstanceCredentialUse,
		ctx: OperationContext,
	): Promise<void> {
		const resolved = await this.instanceCredentialBroker.resolveForUse(policy, ctx);
		if (!resolved) return;
		policy.validate?.({ type: resolved.type, data: resolved.data });
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
		if (!baseUrl && !apiKey) return null;
		const headers = modelCredentialHeaders(credentialType, data);
		return { id, url: baseUrl, ...(apiKey ? { apiKey } : {}), ...(headers ? { headers } : {}) };
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

	private validateAdminSettingsUpdate(
		update: InstanceAiAdminSettingsUpdateRequest,
		current: PersistedAdminSettings,
		sandboxProviderOverride?: InstanceAiSandboxProvider,
	): void {
		const touchesSandboxSettings =
			update.sandboxEnabled !== undefined ||
			update.sandboxProvider !== undefined ||
			update.sandboxImage !== undefined ||
			update.sandboxTimeout !== undefined ||
			update.daytonaCredentialId !== undefined ||
			update.n8nSandboxCredentialId !== undefined ||
			update.sandboxConnection !== undefined;
		if (!touchesSandboxSettings) return;

		const sandboxProvider = normalizeSandboxProvider(
			sandboxProviderOverride ??
				update.sandboxProvider ??
				current.sandboxProvider ??
				this.environmentSandboxProvider,
		);
		const sandboxEnabled = update.sandboxEnabled ?? current.sandboxEnabled ?? false;
		const unavailableReason = this.getSandboxUnavailableReason(sandboxEnabled, sandboxProvider);
		if (unavailableReason) throw new UnprocessableRequestError(unavailableReason);
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
		this.sandboxProviderOverride = persisted.sandboxProvider
			? normalizeSandboxProvider(persisted.sandboxProvider)
			: undefined;
		c.sandboxProvider = this.sandboxProviderOverride ?? this.environmentSandboxProvider;
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
			...(this.sandboxProviderOverride ? { sandboxProvider: this.sandboxProviderOverride } : {}),
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

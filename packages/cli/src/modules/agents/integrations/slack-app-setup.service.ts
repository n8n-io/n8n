import { randomBytes } from 'node:crypto';

import type {
	AgentIntegrationConfig,
	CreateSlackManagerCredentialResponse,
	CreateSlackAgentAppResponse,
	InstallSlackManagedAppResponse,
	SlackManagerCredentialSummary,
	SlackManagedSetupState,
	SlackManagedWorkspaceSummary,
	SlackAgentAppManifest,
	SlackAgentAppManifestResponse,
} from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';

import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import { AgentPublishService } from '../agent-publish.service';
import type { Agent } from '../entities/agent.entity';
import { AgentRepository } from '../repositories/agent.repository';
import { ChatIntegrationService } from './chat-integration.service';

const SLACK_APP_SETUP_CACHE_PREFIX = 'agents:slack-app-setup:';
const SLACK_MANAGED_APP_CACHE_PREFIX = 'agents:slack-managed-app:';
const SLACK_APP_SETUP_TTL_MS = 60 * 60 * 1000;
const DEFAULT_SLACK_APP_NAME = 'n8n Agent';
const SLACK_CREDENTIAL_TYPE = 'slackApi';
const SLACK_MANAGER_CREDENTIAL_TYPE = 'slackOAuth2Api';
const REQUIRED_MANAGER_SCOPES = ['app_configurations:write', 'managed_apps:install'] as const;
const MANAGED_INSTALL_FALLBACK_ERRORS = new Set([
	'installation_denied',
	'app_approval_request_eligible',
	'manager_app_not_eligible',
]);

const REQUIRED_BOT_EVENTS = [
	'app_mention',
	'assistant_thread_started',
	'assistant_thread_context_changed',
	'message.channels',
	'message.groups',
	'message.im',
	'message.mpim',
] as const;

const REQUIRED_BOT_SCOPES = [
	'app_mentions:read',
	'assistant:write',
	'channels:history',
	'channels:join',
	'channels:read',
	'chat:write',
	'files:read',
	'files:write',
	'groups:history',
	'groups:read',
	'im:history',
	'im:read',
	'im:write',
	'mpim:history',
	'mpim:read',
	'mpim:write',
	'reactions:write',
	'users:read',
	'users:read.email',
] as const;

const isLocalhost = (hostname: string): boolean =>
	hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

interface CreateSlackAppOptions {
	projectId: string;
	agentId: string;
	appConfigurationToken: string;
	user: User;
}

interface GetSlackAppManifestOptions {
	projectId: string;
	agentId: string;
}

interface CompleteSlackAppInstallOptions {
	projectId: string;
	agentId: string;
	code: string;
	state: string;
}

interface GetManagedSetupStateOptions {
	projectId: string;
	agentId: string;
	user: User;
}

interface InstallManagedSlackAppOptions extends GetManagedSetupStateOptions {
	managerCredentialId: string;
	workspaceId: string;
}

interface DeleteManagedSlackAppOptions {
	projectId: string;
	agentId: string;
	credentialId: string;
	user: User;
}

interface SlackAppSetupSession {
	projectId: string;
	agentId: string;
	userId: string;
	appId: string;
	clientId: string;
	clientSecret: string;
	signingSecret: string;
	redirectUrl: string;
	managerCredentialId?: string;
	teamId?: string;
}

interface ManagedSlackAppSession extends SlackAppSetupSession {
	managerCredentialId: string;
	teamId: string;
	oauthAuthorizeUrl: string;
}

interface ManagerCredentialContext {
	credential: CredentialsEntity;
	rawData: ICredentialDataDecryptedObject;
	oauthTokenData: Record<string, unknown>;
	accessToken: string;
}

function childRecord(
	record: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const child = record[key];
	return isRecord(child) ? child : undefined;
}

function stringProperty(
	record: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const value = record?.[key];
	return typeof value === 'string' ? value : undefined;
}

function hasSessionShape(value: unknown): value is SlackAppSetupSession {
	const keys: Array<keyof SlackAppSetupSession> = [
		'projectId',
		'agentId',
		'userId',
		'appId',
		'clientId',
		'clientSecret',
		'signingSecret',
		'redirectUrl',
	];
	return isRecord(value) && keys.every((k) => typeof value[k] === 'string');
}

function hasManagedSessionShape(value: unknown): value is ManagedSlackAppSession {
	return (
		hasSessionShape(value) &&
		isRecord(value) &&
		typeof value['managerCredentialId'] === 'string' &&
		typeof value['teamId'] === 'string' &&
		typeof value['oauthAuthorizeUrl'] === 'string'
	);
}

function stringsFromScope(value: unknown): Set<string> {
	if (typeof value !== 'string') return new Set();
	return new Set(value.split(/[\s,]+/).filter(Boolean));
}

@Service()
export class SlackAppSetupService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly cipher: Cipher,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly userRepository: UserRepository,
		private readonly agentRepository: AgentRepository,
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
		private readonly agentPublishService: AgentPublishService,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly urlService: UrlService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async createApp(options: CreateSlackAppOptions): Promise<CreateSlackAgentAppResponse> {
		const appConfigurationToken = options.appConfigurationToken.trim();
		if (!appConfigurationToken) {
			throw new BadRequestError('Slack app configuration token is required');
		}

		const agent = await this.getAgent(options.agentId, options.projectId);
		const redirectUrl = this.callbackUrl(options.projectId, options.agentId);
		const manifest = this.buildManifest(agent.name, options.projectId, options.agentId, {
			redirectUrl,
		});
		const response = await this.callSlackApi('apps.manifest.create', {
			token: appConfigurationToken,
			manifest: JSON.stringify(manifest),
		});

		if (response.ok !== true) {
			throw this.slackError('create the Slack app', response);
		}

		const credentials = childRecord(response, 'credentials');
		const appId = stringProperty(response, 'app_id');
		const clientId = stringProperty(credentials, 'client_id');
		const clientSecret = stringProperty(credentials, 'client_secret');
		const signingSecret = stringProperty(credentials, 'signing_secret');
		const oauthAuthorizeUrl = stringProperty(response, 'oauth_authorize_url');
		if (!appId || !clientId || !clientSecret || !signingSecret || !oauthAuthorizeUrl) {
			throw new BadRequestError('Slack returned an incomplete app setup response');
		}

		const state = randomBytes(32).toString('hex');
		const setupSession = {
			projectId: options.projectId,
			agentId: options.agentId,
			userId: options.user.id,
			appId,
			clientId,
			clientSecret,
			signingSecret,
			redirectUrl,
		} satisfies SlackAppSetupSession;
		await this.storeSession(state, setupSession);

		return {
			appId,
			installUrl: this.installUrl(oauthAuthorizeUrl, state, redirectUrl),
		};
	}

	async getManualManifest(
		options: GetSlackAppManifestOptions,
	): Promise<SlackAgentAppManifestResponse> {
		const agent = await this.getAgent(options.agentId, options.projectId);
		return {
			manifest: this.buildManifest(agent.name, options.projectId, options.agentId),
		};
	}

	isManagedSetupAvailable(): boolean {
		const overwrite = this.credentialsOverwrites.getOverwrites(SLACK_MANAGER_CREDENTIAL_TYPE);
		if (
			typeof overwrite?.clientId !== 'string' ||
			overwrite.clientId.trim().length === 0 ||
			typeof overwrite.clientSecret !== 'string' ||
			overwrite.clientSecret.trim().length === 0
		) {
			return false;
		}

		const configuredScopes = stringsFromScope(overwrite.userScope);
		return REQUIRED_MANAGER_SCOPES.every((scope) => configuredScopes.has(scope));
	}

	assertManagedSetupAvailable(): void {
		if (!this.isManagedSetupAvailable()) {
			throw new NotFoundError('Managed Slack setup is not available');
		}
	}

	async getManagedSetupState(
		options: GetManagedSetupStateOptions,
	): Promise<SlackManagedSetupState> {
		if (!this.isManagedSetupAvailable()) {
			return { managedSetupAvailable: false, managerCredentials: [] };
		}

		const agent = await this.getAgent(options.agentId, options.projectId);
		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			options.user,
			{
				projectId: options.projectId,
			},
		);
		const managerCredentials: SlackManagerCredentialSummary[] = [];

		for (const usableCredential of usableCredentials) {
			if (usableCredential.type !== SLACK_MANAGER_CREDENTIAL_TYPE) continue;
			const credential = await this.credentialsFinderService.findCredentialForUser(
				usableCredential.id,
				options.user,
				['credential:read'],
			);
			if (!credential) continue;

			const rawData = await this.credentialsService.decrypt(credential, true);
			if (!this.usesManagedSlackAuth(rawData)) {
				continue;
			}

			const oauthTokenData = childRecord(rawData, 'oauthTokenData');
			const authedUser = oauthTokenData ? childRecord(oauthTokenData, 'authed_user') : undefined;
			const accessToken = stringProperty(authedUser, 'access_token');
			const grantedScopes = stringsFromScope(
				stringProperty(authedUser, 'scope') ?? stringProperty(oauthTokenData, 'scope'),
			);
			const reconnectRequired =
				!!accessToken && REQUIRED_MANAGER_SCOPES.some((scope) => !grantedScopes.has(scope));
			const workspaces =
				accessToken && oauthTokenData
					? await this.getWorkspacesFromContext(
							{ credential, rawData, oauthTokenData, accessToken },
							agent,
							options.user,
							false,
						)
					: [];

			managerCredentials.push({
				id: credential.id,
				name: credential.name,
				connected: !!accessToken,
				reconnectRequired,
				workspaces,
			});
		}

		return { managedSetupAvailable: true, managerCredentials };
	}

	async createManagerCredential(
		options: GetManagedSetupStateOptions,
	): Promise<CreateSlackManagerCredentialResponse> {
		this.assertManagedSetupAvailable();
		await this.getAgent(options.agentId, options.projectId);
		const credential = await this.credentialsService.createUnmanagedCredential(
			{
				name: 'Slack workspace manager',
				type: SLACK_MANAGER_CREDENTIAL_TYPE,
				data: { customScopes: true },
				projectId: options.projectId,
			},
			options.user,
		);

		return {
			id: credential.id,
			name: credential.name,
			type: SLACK_MANAGER_CREDENTIAL_TYPE,
			isResolvable: false,
		};
	}

	async installManagedApp(
		options: InstallManagedSlackAppOptions,
	): Promise<InstallSlackManagedAppResponse> {
		this.assertManagedSetupAvailable();
		const agent = await this.getAgent(options.agentId, options.projectId);
		const existing = await this.findManagedBotCredential(
			agent,
			options.workspaceId,
			options.managerCredentialId,
			options.user,
		);
		if (existing) {
			return { status: 'connected', appId: existing.appId, credentialId: existing.credentialId };
		}

		const manager = await this.getManagerCredentialContext(
			options.managerCredentialId,
			options.projectId,
			options.user,
		);
		const workspaces = await this.getWorkspacesFromContext(manager, agent, options.user);
		if (!workspaces.some((workspace) => workspace.id === options.workspaceId)) {
			throw new NotFoundError('Slack workspace is not available to this credential');
		}

		const { session, created } = await this.getOrCreateManagedAppSession(options, agent, manager);
		const response = await this.callManagerSlackApi(manager, 'apps.managedInstall', {
			app_id: session.appId,
			team_id: options.workspaceId,
			bot_scopes: REQUIRED_BOT_SCOPES.join(','),
		});

		if (response.ok === true) {
			const apiAccessTokens = childRecord(response, 'api_access_tokens');
			const botAccessToken = stringProperty(apiAccessTokens, 'bot_access_token');
			if (!botAccessToken?.startsWith('xoxb-')) {
				throw new BadRequestError('Slack did not return a Bot User OAuth Token');
			}
			const credentialId = await this.connectBotCredential(
				agent,
				options.user,
				botAccessToken,
				session,
			);
			await this.cacheService.delete(this.managedAppCacheKey(options));
			return { status: 'connected', appId: session.appId, credentialId };
		}

		const error = stringProperty(response, 'error') ?? 'unknown_error';
		if (MANAGED_INSTALL_FALLBACK_ERRORS.has(error)) {
			const state = randomBytes(32).toString('hex');
			await this.storeSession(state, session);
			return {
				status: 'manual_install_required',
				appId: session.appId,
				installUrl: this.installUrl(session.oauthAuthorizeUrl, state, session.redirectUrl),
			};
		}

		if (created) {
			const cleanupResponse = await this.callManagerSlackApi(manager, 'apps.manifest.delete', {
				app_id: session.appId,
			});
			if (cleanupResponse.ok === true) {
				await this.cacheService.delete(this.managedAppCacheKey(options));
			}
		}
		throw this.slackError('install the Slack app', response);
	}

	async deleteManagedAppForCredential(options: DeleteManagedSlackAppOptions): Promise<void> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			options.credentialId,
			options.user,
			['credential:read'],
		);
		if (!credential || credential.type !== SLACK_CREDENTIAL_TYPE) return;

		const data = await this.credentialsService.decrypt(credential, true);
		const managedAppId = typeof data.managedAppId === 'string' ? data.managedAppId : undefined;
		if (!managedAppId) return;

		const managerCredentialId =
			typeof data.managerCredentialId === 'string' ? data.managerCredentialId : undefined;
		if (!managerCredentialId) {
			throw new BadRequestError('The managed Slack app is missing its manager credential');
		}

		const manager = await this.getManagerCredentialContext(
			managerCredentialId,
			options.projectId,
			options.user,
		);
		const response = await this.callManagerSlackApi(manager, 'apps.manifest.delete', {
			app_id: managedAppId,
		});
		if (response.ok !== true && stringProperty(response, 'error') !== 'app_not_found') {
			throw this.slackError('delete the Slack app', response);
		}

		if (typeof data.teamId === 'string') {
			await this.cacheService.delete(
				this.managedAppCacheKey({
					projectId: options.projectId,
					agentId: options.agentId,
					managerCredentialId,
					workspaceId: data.teamId,
				}),
			);
		}
	}

	async completeInstall(options: CompleteSlackAppInstallOptions): Promise<void> {
		const session = await this.consumeSession(options.state);
		if (session.projectId !== options.projectId || session.agentId !== options.agentId) {
			throw new BadRequestError('Slack app setup state does not match this agent');
		}

		const user = await this.userRepository.findOne({
			where: { id: session.userId },
			relations: ['role'],
		});
		if (!user) {
			throw new NotFoundError(`User "${session.userId}" not found`);
		}

		const agent = await this.getAgent(session.agentId, session.projectId);
		const tokenResponse = await this.callSlackApi(
			'oauth.v2.access',
			{
				code: options.code,
				redirect_uri: session.redirectUrl,
			},
			{
				Authorization: `Basic ${Buffer.from(`${session.clientId}:${session.clientSecret}`).toString(
					'base64',
				)}`,
			},
		);
		if (tokenResponse.ok !== true) {
			throw this.slackError('finish Slack app installation', tokenResponse);
		}

		const accessToken = stringProperty(tokenResponse, 'access_token');
		if (!accessToken?.startsWith('xoxb-')) {
			throw new BadRequestError('Slack did not return a Bot User OAuth Token');
		}

		await this.connectBotCredential(agent, user, accessToken, session);
		if (session.managerCredentialId && session.teamId) {
			await this.cacheService.delete(
				this.managedAppCacheKey({
					projectId: session.projectId,
					agentId: session.agentId,
					managerCredentialId: session.managerCredentialId,
					workspaceId: session.teamId,
				}),
			);
		}
	}

	private async getManagerCredentialContext(
		credentialId: string,
		projectId: string,
		user: User,
	): Promise<ManagerCredentialContext> {
		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ projectId },
		);
		if (
			!usableCredentials.some(
				(credential) =>
					credential.id === credentialId && credential.type === SLACK_MANAGER_CREDENTIAL_TYPE,
			)
		) {
			throw new NotFoundError(`Credential "${credentialId}" not found`);
		}

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) throw new NotFoundError(`Credential "${credentialId}" not found`);
		const rawData = await this.credentialsService.decrypt(credential, true);
		if (!this.usesManagedSlackAuth(rawData)) {
			throw new BadRequestError('The selected Slack credential does not use managed OAuth');
		}
		const oauthTokenData = childRecord(rawData, 'oauthTokenData');
		const authedUser = oauthTokenData ? childRecord(oauthTokenData, 'authed_user') : undefined;
		const accessToken = stringProperty(authedUser, 'access_token');
		if (!oauthTokenData || !accessToken) {
			throw new BadRequestError('The selected Slack credential is not connected');
		}
		const grantedScopes = stringsFromScope(
			stringProperty(authedUser, 'scope') ?? stringProperty(oauthTokenData, 'scope'),
		);
		if (REQUIRED_MANAGER_SCOPES.some((scope) => !grantedScopes.has(scope))) {
			throw new BadRequestError('Reconnect the Slack credential to grant managed app access');
		}

		return { credential, rawData, oauthTokenData, accessToken };
	}

	private usesManagedSlackAuth(data: ICredentialDataDecryptedObject): boolean {
		const hasCustomClient =
			(typeof data.clientId === 'string' && data.clientId.trim().length > 0) ||
			(typeof data.clientSecret === 'string' && data.clientSecret.trim().length > 0);
		return (
			!hasCustomClient &&
			this.credentialsOverwrites.usesManagedAuth(SLACK_MANAGER_CREDENTIAL_TYPE, data)
		);
	}

	private async getWorkspacesFromContext(
		manager: ManagerCredentialContext,
		agent: Agent,
		user: User,
		allowRefresh = true,
	): Promise<SlackManagedWorkspaceSummary[]> {
		const team = childRecord(manager.oauthTokenData, 'team');
		const enterprise = childRecord(manager.oauthTokenData, 'enterprise');
		const isEnterpriseInstall = manager.oauthTokenData.is_enterprise_install === true;
		const workspaceRecords: Array<Record<string, unknown>> = [];

		if (isEnterpriseInstall) {
			let cursor = '';
			do {
				const response = allowRefresh
					? await this.callManagerSlackApi(manager, 'auth.teams.list', {
							limit: '100',
							...(cursor ? { cursor } : {}),
						})
					: await this.callSlackApi('auth.teams.list', {
							token: manager.accessToken,
							limit: '100',
							...(cursor ? { cursor } : {}),
						});
				if (response.ok !== true) break;
				const teams = response.teams;
				if (Array.isArray(teams)) {
					workspaceRecords.push(...teams.filter(isRecord));
				}
				cursor =
					stringProperty(childRecord(response, 'response_metadata'), 'next_cursor')?.trim() ?? '';
			} while (cursor);
		} else if (team) {
			workspaceRecords.push(team);
		}

		const enterpriseId = stringProperty(enterprise, 'id');
		const result: SlackManagedWorkspaceSummary[] = [];
		for (const workspace of workspaceRecords) {
			const id = stringProperty(workspace, 'id');
			if (!id) continue;
			const existing = manager.credential.id
				? await this.findManagedBotCredential(agent, id, manager.credential.id, user)
				: undefined;
			result.push({
				id,
				name: stringProperty(workspace, 'name') ?? stringProperty(workspace, 'domain') ?? id,
				...(enterpriseId ? { enterpriseId } : {}),
				...(existing
					? {
							managedAppId: existing.appId,
							botCredentialId: existing.credentialId,
							connected: true,
						}
					: { connected: false }),
			});
		}
		return result;
	}

	private async findManagedBotCredential(
		agent: Agent,
		workspaceId: string,
		managerCredentialId: string,
		user: User,
	): Promise<{ appId: string; credentialId: string } | undefined> {
		for (const integration of agent.integrations ?? []) {
			if (integration.type !== 'slack' || !integration.credentialId) continue;
			const credential = await this.credentialsFinderService.findCredentialForUser(
				integration.credentialId,
				user,
				['credential:read'],
			);
			if (!credential || credential.type !== SLACK_CREDENTIAL_TYPE) continue;
			const data = await this.credentialsService.decrypt(credential, true);
			if (
				data.teamId === workspaceId &&
				data.managerCredentialId === managerCredentialId &&
				typeof data.managedAppId === 'string'
			) {
				return { appId: data.managedAppId, credentialId: credential.id };
			}
		}
		return undefined;
	}

	private async getOrCreateManagedAppSession(
		options: InstallManagedSlackAppOptions,
		agent: Agent,
		manager: ManagerCredentialContext,
	): Promise<{ session: ManagedSlackAppSession; created: boolean }> {
		const key = this.managedAppCacheKey(options);
		const cached = await this.cacheService.get<unknown>(key);
		if (typeof cached === 'string') {
			const session = await this.decryptManagedAppSession(cached);
			if (session) return { session, created: false };
		}

		const redirectUrl = this.callbackUrl(options.projectId, options.agentId);
		const manifest = this.buildManifest(agent.name, options.projectId, options.agentId, {
			redirectUrl,
			managed: true,
		});

		const response = await this.callManagerSlackApi(manager, 'apps.manifest.create', {
			manifest: JSON.stringify(manifest),
			team: options.workspaceId,
		});
		if (response.ok !== true) throw this.slackError('create the Slack app', response);

		const credentials = childRecord(response, 'credentials');
		const appId = stringProperty(response, 'app_id');
		const clientId = stringProperty(credentials, 'client_id');
		const clientSecret = stringProperty(credentials, 'client_secret');
		const signingSecret = stringProperty(credentials, 'signing_secret');
		const oauthAuthorizeUrl = stringProperty(response, 'oauth_authorize_url');
		if (!appId || !clientId || !clientSecret || !signingSecret || !oauthAuthorizeUrl) {
			throw new BadRequestError('Slack returned an incomplete app setup response');
		}

		const session = {
			projectId: options.projectId,
			agentId: options.agentId,
			userId: options.user.id,
			appId,
			clientId,
			clientSecret,
			signingSecret,
			redirectUrl,
			managerCredentialId: options.managerCredentialId,
			teamId: options.workspaceId,
			oauthAuthorizeUrl,
		} satisfies ManagedSlackAppSession;
		await this.cacheService.set(
			key,
			await this.cipher.encryptV2(JSON.stringify(session)),
			SLACK_APP_SETUP_TTL_MS,
		);
		return { session, created: true };
	}

	private async decryptManagedAppSession(
		value: string,
	): Promise<ManagedSlackAppSession | undefined> {
		try {
			const decrypted = await this.cipher.decryptV2(value);
			const session = jsonParse<unknown>(decrypted, { fallbackValue: null });
			if (hasManagedSessionShape(session)) {
				return session;
			}
		} catch {}
		return undefined;
	}

	private async callManagerSlackApi(
		manager: ManagerCredentialContext,
		method: string,
		params: Record<string, string>,
	): Promise<Record<string, unknown>> {
		let response = await this.callSlackApi(method, { ...params, token: manager.accessToken });
		const error = stringProperty(response, 'error');
		if (!['invalid_auth', 'token_expired'].includes(error ?? '')) return response;

		const authedUser = childRecord(manager.oauthTokenData, 'authed_user');
		const refreshToken = stringProperty(authedUser, 'refresh_token');
		const overwrite = this.credentialsOverwrites.getOverwrites(SLACK_MANAGER_CREDENTIAL_TYPE);
		if (
			!refreshToken ||
			typeof overwrite?.clientId !== 'string' ||
			typeof overwrite.clientSecret !== 'string'
		) {
			return response;
		}

		const refreshResponse = await this.callSlackApi('oauth.v2.access', {
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: overwrite.clientId,
			client_secret: overwrite.clientSecret,
		});
		const refreshedAuthedUser = childRecord(refreshResponse, 'authed_user');
		const refreshedAccessToken = stringProperty(refreshedAuthedUser, 'access_token');
		if (refreshResponse.ok !== true || !refreshedAuthedUser || !refreshedAccessToken) {
			return response;
		}

		const oauthTokenData = {
			...manager.oauthTokenData,
			...refreshResponse,
			authed_user: { ...authedUser, ...refreshedAuthedUser },
		};
		const updatedData = { ...manager.rawData, oauthTokenData };
		const encrypted = await this.credentialsService.createEncryptedData({
			id: manager.credential.id,
			name: manager.credential.name,
			type: manager.credential.type,
			data: updatedData,
		});
		await this.credentialsService.update(manager.credential.id, encrypted, updatedData);
		manager.oauthTokenData = oauthTokenData;
		manager.accessToken = refreshedAccessToken;
		response = await this.callSlackApi(method, { ...params, token: refreshedAccessToken });
		return response;
	}

	private async connectBotCredential(
		agent: Agent,
		user: User,
		accessToken: string,
		session: SlackAppSetupSession,
	): Promise<string> {
		const credential = await this.credentialsService.createUnmanagedCredential(
			{
				name: this.credentialName(agent.name),
				type: SLACK_CREDENTIAL_TYPE,
				data: {
					accessToken,
					signatureSecret: session.signingSecret,
					...(session.managerCredentialId
						? {
								managedAppId: session.appId,
								teamId: session.teamId,
								managerCredentialId: session.managerCredentialId,
							}
						: {}),
				},
				projectId: session.projectId,
			},
			user,
		);
		const integration = {
			type: 'slack',
			credentialId: credential.id,
		} satisfies AgentIntegrationConfig;
		const savedAgent = await this.agentIntegrationPersistenceService.saveCredentialIntegration(
			agent,
			integration,
			{ broadcast: false },
		);

		try {
			await this.agentPublishService.publishAgent(
				session.agentId,
				session.projectId,
				user,
				'slack_setup',
				undefined,
				{ syncIntegrations: false, ignoreDraftIntegrations: true },
			);
			await this.chatIntegrationService.connect(session.agentId, integration, session.projectId);
			await this.chatIntegrationService.broadcastIntegrationChange(
				session.agentId,
				integration,
				'connect',
			);
			return credential.id;
		} catch (error) {
			await this.agentIntegrationPersistenceService.removeCredentialIntegration(
				savedAgent,
				'slack',
				credential.id,
				{ broadcast: false },
			);
			await this.credentialsService.delete(user, credential.id);
			await this.agentPublishService
				.publishAgent(session.agentId, session.projectId, user, 'slack_setup', undefined, {
					syncIntegrations: false,
					ignoreDraftIntegrations: true,
				})
				.catch(() => {});
			throw error;
		}
	}

	private async getAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		return agent;
	}

	private buildManifest(
		agentName: string,
		projectId: string,
		agentId: string,
		options: { redirectUrl?: string; managed?: boolean } = {},
	): SlackAgentAppManifest {
		const slackAppName = this.sanitiseSlackAppName(agentName);
		const webhookUrl = this.webhookUrl(projectId, agentId);
		return {
			display_information: {
				name: slackAppName,
				...(options.managed
					? { description: `Connect ${slackAppName} to Slack through n8n.` }
					: {}),
			},
			features: {
				app_home: {
					home_tab_enabled: true,
					messages_tab_enabled: true,
					messages_tab_read_only_enabled: false,
				},
				bot_user: {
					display_name: slackAppName,
					always_online: true,
				},
			},
			oauth_config: {
				...(options.redirectUrl ? { redirect_urls: [options.redirectUrl] } : {}),
				scopes: {
					bot: [...REQUIRED_BOT_SCOPES],
				},
			},
			settings: {
				event_subscriptions: {
					request_url: webhookUrl,
					bot_events: [...REQUIRED_BOT_EVENTS],
				},
				interactivity: {
					is_enabled: true,
					request_url: webhookUrl,
				},
				org_deploy_enabled: false,
				socket_mode_enabled: false,
				token_rotation_enabled: false,
				...(options.managed
					? {
							managed_app_settings: {
								is_install_from_slack_disabled: true,
								external_app_management_url: this.managedAppUrl(projectId, agentId),
							},
						}
					: {}),
			},
		};
	}

	private webhookUrl(projectId: string, agentId: string): string {
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/webhooks/slack`;
	}

	private callbackUrl(projectId: string, agentId: string): string {
		return `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/integrations/slack/oauth/callback`;
	}

	private managedAppUrl(projectId: string, agentId: string): string {
		const url = new URL(
			`/projects/${projectId}/agents/${agentId}`,
			`${this.urlService.getInstanceBaseUrl()}/`,
		);
		const isDevelopment = process.env.NODE_ENV === 'development' && isLocalhost(url.hostname);
		// TODO: Remove
		if (isDevelopment) {
			url.protocol = 'https:';
		}
		return url.toString();
	}

	private installUrl(oauthAuthorizeUrl: string, state: string, redirectUrl: string): string {
		try {
			const url = new URL(oauthAuthorizeUrl);
			url.searchParams.set('state', state);
			url.searchParams.set('redirect_uri', redirectUrl);
			return url.toString();
		} catch {
			throw new BadRequestError('Slack returned an invalid installation URL');
		}
	}

	private async consumeSession(state: string): Promise<SlackAppSetupSession> {
		const key = this.cacheKey(state);
		const cached = await this.cacheService.take<unknown>(key);
		if (typeof cached !== 'string') {
			throw new BadRequestError('Slack app setup state has expired or is invalid');
		}

		try {
			const decrypted = await this.cipher.decryptV2(cached);
			const session = jsonParse<unknown>(decrypted, { fallbackValue: null });
			if (hasSessionShape(session)) {
				return session;
			}
		} catch {}

		throw new BadRequestError('Slack app setup state has expired or is invalid');
	}

	private async storeSession(state: string, session: SlackAppSetupSession): Promise<void> {
		await this.cacheService.set(
			this.cacheKey(state),
			await this.cipher.encryptV2(JSON.stringify(session)),
			SLACK_APP_SETUP_TTL_MS,
		);
	}

	private cacheKey(state: string): string {
		return `${SLACK_APP_SETUP_CACHE_PREFIX}${state}`;
	}

	private managedAppCacheKey(options: {
		projectId: string;
		agentId: string;
		managerCredentialId: string;
		workspaceId: string;
	}): string {
		return `${SLACK_MANAGED_APP_CACHE_PREFIX}${options.projectId}:${options.agentId}:${options.managerCredentialId}:${options.workspaceId}`;
	}

	private credentialName(agentName: string): string {
		return `Slack - ${agentName || DEFAULT_SLACK_APP_NAME}`.slice(0, 128);
	}

	private sanitiseSlackAppName(raw: string): string {
		const cleaned = raw
			.replace(/[^a-zA-Z0-9 ._-]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 35);
		return cleaned.length > 0 ? cleaned : DEFAULT_SLACK_APP_NAME;
	}

	private async callSlackApi(
		method: string,
		params: Record<string, string>,
		headers: Record<string, string> = {},
	): Promise<Record<string, unknown>> {
		try {
			const response = await this.outboundHttp
				.requests({
					ssrf: 'disabled', // the Slack API host is fixed and public
				})
				.request({
					method: 'POST',
					url: `https://slack.com/api/${method}`,
					headers: {
						...headers,
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: params,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true, // Status errors are ignored because Slack signals failures in the JSON body
				});
			const data: unknown = response.body;
			if (!isRecord(data)) {
				return { ok: false, error: 'invalid_response' };
			}
			return data;
		} catch {
			return { ok: false, error: 'slack_request_failed' };
		}
	}

	private slackError(action: string, response: Record<string, unknown>): BadRequestError {
		const error = stringProperty(response, 'error') ?? 'unknown_error';
		return new BadRequestError(`Slack could not ${action}: ${error}`);
	}
}

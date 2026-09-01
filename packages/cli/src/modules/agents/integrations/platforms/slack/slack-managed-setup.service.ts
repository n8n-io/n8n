import type {
	AgentIntegrationConfig,
	CreateSlackManagerCredentialResponse,
	InstallSlackManagedAppResponse,
	SlackManagedAppSettings,
	SlackManagedSetupState,
	SlackManagedWorkspaceSummary,
	SlackManagerCredentialSummary,
} from '@n8n/api-types';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { CacheService } from '@/services/cache/cache.service';

import { SlackMethodsService } from './slack-methods.service';
import { childRecord, SLACK_BOT_SCOPES, type SlackAppSetupSession } from './slack-setup.types';
import type { Agent } from '../../../entities/agent.entity';
import { AgentRepository } from '../../../repositories/agent.repository';
import { stringProperty } from '../../integration-helpers';

const SLACK_MANAGED_APP_CACHE_PREFIX = 'agents:slack-managed-app:';
const SLACK_APP_SETUP_TTL_MS = 60 * 60 * 1000;
const SLACK_CREDENTIAL_TYPE = 'slackApi';
const SLACK_MANAGER_CREDENTIAL_TYPE = 'slackManagerOAuth2Api';
const DEFAULT_SLACK_MANAGER_CREDENTIAL_NAME = 'Workspace credentials';
const REQUIRED_MANAGER_SCOPES = [
	'app_configurations:read',
	'app_configurations:write',
	'managed_apps:install',
] as const;
const MANAGED_INSTALL_FALLBACK_ERRORS = new Set([
	'installation_denied',
	'app_approval_request_eligible',
	'manager_app_not_eligible',
]);
const MANAGED_INSTALL_APPROVAL_ERRORS = new Set([
	'app_approval_request_pending',
	'app_approval_request_denied',
]);

export interface GetManagedSetupStateOptions {
	projectId: string;
	agentId: string;
	user: User;
}

export interface InstallManagedSlackAppOptions extends GetManagedSetupStateOptions {
	managerCredentialId: string;
	workspaceId: string;
}

export interface FinalizeSlackManagerCredentialOptions extends GetManagedSetupStateOptions {
	credentialId: string;
}

export interface GetManagedSlackAppSettingsOptions extends GetManagedSetupStateOptions {
	credentialId: string;
}

export interface UpdateManagedSlackAppSettingsOptions extends GetManagedSlackAppSettingsOptions {
	name: string;
	description: string;
	alwaysOnline: boolean;
}

export interface DeleteManagedSlackAppOptions {
	projectId: string;
	agentId: string;
	credentialId: string;
	user: User;
	deleteExternalResource?: boolean;
}

export interface ManagedSlackAppDeletionWarning {
	integrationType: 'slack';
	code: 'app_not_deleted';
	action: {
		type: 'open_url';
		url: string;
	};
	details: {
		appId: string;
	};
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

interface ManagedBotCredentialContext {
	credential: CredentialsEntity;
	rawData: ICredentialDataDecryptedObject;
	managedAppId: string;
	managerCredentialId: string;
	teamId: string;
}

type RefreshTokenResponse = {
	access_token: string;
	expires_in: number;
	refresh_token: string;
	token_type: string;
	app_id: string;
	scope: string;
	user_id: string;
	team: {
		id: string;
		name: string;
	};
	enterprise: Record<string, unknown> | null;
	is_enterprise_install: boolean;
};

type SlackApiParams = Record<string, string> | FormData;
type SlackApiParamsFactory = (accessToken: string) => SlackApiParams;

function stringsFromScope(value: unknown): Set<string> {
	if (typeof value !== 'string') return new Set();
	return new Set(value.split(/[\s,]+/).filter(Boolean));
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
	return isRecord(value) && keys.every((key) => typeof value[key] === 'string');
}

function hasManagedSessionShape(value: unknown): value is ManagedSlackAppSession {
	return (
		hasSessionShape(value) &&
		isRecord(value) &&
		typeof value.managerCredentialId === 'string' &&
		typeof value.teamId === 'string' &&
		typeof value.oauthAuthorizeUrl === 'string'
	);
}

@Service()
export class SlackManagedSetupService {
	constructor(
		private readonly methods: SlackMethodsService,
		private readonly cacheService: CacheService,
		private readonly cipher: Cipher,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly agentRepository: AgentRepository,
	) {}

	isSetupAvailable(): boolean {
		const overwrite = this.credentialsOverwrites.getOverwrites(SLACK_MANAGER_CREDENTIAL_TYPE);
		if (
			typeof overwrite?.clientId !== 'string' ||
			overwrite.clientId.trim().length === 0 ||
			typeof overwrite.clientSecret !== 'string' ||
			overwrite.clientSecret.trim().length === 0
		) {
			return false;
		}
		return true;
	}

	async getSetupState(options: GetManagedSetupStateOptions): Promise<SlackManagedSetupState> {
		if (!this.isSetupAvailable()) {
			return { managedSetupAvailable: false, managerCredentials: [] };
		}

		const agent = await this.agentRepository.findByIdAndProjectId(
			options.agentId,
			options.projectId,
		);
		const integrations = agent?.integrations ?? [];
		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			options.user,
			{ projectId: options.projectId },
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
			if (!this.usesManagedSlackAuth(rawData)) continue;
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
							integrations,
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
		this.assertSetupAvailable();
		await this.methods.getAgent(options.agentId, options.projectId);
		const credential = await this.credentialsService.createUnmanagedCredential(
			{
				name: DEFAULT_SLACK_MANAGER_CREDENTIAL_NAME,
				type: SLACK_MANAGER_CREDENTIAL_TYPE,
				data: {},
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

	async finalizeManagerCredential(options: FinalizeSlackManagerCredentialOptions): Promise<void> {
		await this.methods.getAgent(options.agentId, options.projectId);
		const manager = await this.getManagerCredentialContext(
			options.credentialId,
			options.projectId,
			options.user,
		);
		if (manager.credential.name !== DEFAULT_SLACK_MANAGER_CREDENTIAL_NAME) return;

		const response = await this.callManagerSlackApi(manager, 'auth.test', {});
		if (!response.ok) return;
		const userName = stringProperty(response, 'user');
		if (!userName) return;
		const teamName = stringProperty(response, 'team');
		const name = [
			DEFAULT_SLACK_MANAGER_CREDENTIAL_NAME,
			teamName ? `${userName} @ ${teamName}` : userName,
		]
			.join(' - ')
			.slice(0, 128);
		const encrypted = await this.credentialsService.createEncryptedData({
			id: manager.credential.id,
			name,
			type: manager.credential.type,
			data: manager.rawData,
		});
		await this.credentialsService.update(options.credentialId, encrypted, manager.rawData);
	}

	async installApp(
		options: InstallManagedSlackAppOptions,
	): Promise<InstallSlackManagedAppResponse> {
		this.assertSetupAvailable();
		const agent = await this.methods.getAgent(options.agentId, options.projectId);
		const existing = await this.findManagedBotCredential(
			agent.integrations ?? [],
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
		const workspaces = await this.getWorkspacesFromContext(
			manager,
			agent.integrations ?? [],
			options.user,
		);
		const workspace = workspaces.find(({ id }) => id === options.workspaceId);
		if (!workspace) {
			throw new NotFoundError('Slack workspace is not available to this credential');
		}

		const { session, created } = await this.getOrCreateManagedAppSession(
			options,
			agent,
			manager,
			workspace.name,
		);
		const response = await this.callManagerSlackApi(manager, 'apps.managedInstall', {
			app_id: session.appId,
			team_id: options.workspaceId,
			bot_scopes: SLACK_BOT_SCOPES.join(','),
		});

		if (response.ok) {
			const botAccessToken = stringProperty(
				childRecord(response, 'api_access_tokens'),
				'bot_access_token',
			);
			if (!botAccessToken?.startsWith('xoxb-')) {
				throw new BadRequestError('Slack did not return a Bot User OAuth Token');
			}
			const credentialId = await this.methods.connectBotCredential(
				agent,
				options.user,
				botAccessToken,
				session,
			);
			return { status: 'connected', appId: session.appId, credentialId };
		}

		const error = stringProperty(response, 'error') ?? 'unknown_error';
		if (MANAGED_INSTALL_APPROVAL_ERRORS.has(error)) {
			throw this.methods.slackError('install the Slack app', response);
		}
		const responseOauthAuthorizeUrl = stringProperty(response, 'oauth_authorize_url');
		if (responseOauthAuthorizeUrl || MANAGED_INSTALL_FALLBACK_ERRORS.has(error)) {
			const oauthAuthorizeUrl = responseOauthAuthorizeUrl ?? session.oauthAuthorizeUrl;
			const teamId = stringProperty(response, 'team_id') ?? session.teamId;
			const updatedSession: ManagedSlackAppSession = { ...session, oauthAuthorizeUrl, teamId };
			const state = randomBytes(32).toString('hex');
			await this.methods.storeSession(state, updatedSession);
			return {
				status: 'manual_install_required',
				appId: session.appId,
				installUrl: this.methods.installUrl(oauthAuthorizeUrl, state, session.redirectUrl),
			};
		}

		if (created) {
			const cleanupResponse = await this.callManagerSlackApi(manager, 'apps.manifest.delete', {
				app_id: session.appId,
			});
			if (cleanupResponse.ok) {
				await this.cacheService.delete(
					this.managedAppCacheKey({ ...options, userId: options.user.id }),
				);
			}
		}
		throw this.methods.slackError('install the Slack app', response);
	}

	async getAppSettings(
		options: GetManagedSlackAppSettingsOptions,
	): Promise<SlackManagedAppSettings> {
		this.assertSetupAvailable();
		const bot = await this.getManagedBotCredentialContext(options);
		const manager = await this.getManagerCredentialContext(
			bot.managerCredentialId,
			options.projectId,
			options.user,
		);
		const manifest = await this.exportManagedAppManifest(manager, bot.managedAppId);
		return this.managedAppSettingsFromManifest(options.credentialId, bot.managedAppId, manifest);
	}

	async updateAppSettings(
		options: UpdateManagedSlackAppSettingsOptions,
	): Promise<SlackManagedAppSettings> {
		this.assertSetupAvailable();
		const bot = await this.getManagedBotCredentialContext(options);
		const manager = await this.getManagerCredentialContext(
			bot.managerCredentialId,
			options.projectId,
			options.user,
		);
		const manifest = await this.exportManagedAppManifest(manager, bot.managedAppId);
		const displayInformation = childRecord(manifest, 'display_information') ?? {};
		const features = childRecord(manifest, 'features') ?? {};
		const appHome = childRecord(features, 'app_home') ?? {};
		const botUser = childRecord(features, 'bot_user') ?? {};
		const updatedManifest = {
			...manifest,
			display_information: { ...displayInformation, description: options.description },
			features: {
				...features,
				app_home: { ...appHome, home_tab_enabled: false },
				bot_user: {
					...botUser,
					display_name: options.name,
					always_online: options.alwaysOnline,
				},
			},
		};

		const updateResponse = await this.callManagerSlackApi(manager, 'apps.manifest.update', {
			app_id: bot.managedAppId,
			manifest: JSON.stringify(updatedManifest),
		});
		if (!updateResponse.ok) {
			throw this.methods.slackError('update the Slack app', updateResponse);
		}

		return this.managedAppSettingsFromManifest(
			options.credentialId,
			bot.managedAppId,
			updatedManifest,
		);
	}

	async deleteAppForCredential(
		options: DeleteManagedSlackAppOptions,
	): Promise<ManagedSlackAppDeletionWarning | undefined> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			options.credentialId,
			options.user,
			['credential:read'],
		);
		if (!credential || credential.type !== SLACK_CREDENTIAL_TYPE) return;

		const data = await this.credentialsService.decrypt(credential, true);
		const managedAppId = stringProperty(data, 'managedAppId');
		const managerCredentialId = stringProperty(data, 'managerCredentialId');
		const shouldDeleteExternalResource = options.deleteExternalResource === true;
		if (managedAppId && !managerCredentialId && shouldDeleteExternalResource) {
			throw new BadRequestError('The managed Slack app is missing its manager credential');
		}

		let warning: ManagedSlackAppDeletionWarning | undefined;
		if (managedAppId && managerCredentialId && shouldDeleteExternalResource) {
			try {
				const manager = await this.getManagerCredentialContext(
					managerCredentialId,
					options.projectId,
					options.user,
				);
				const response = await this.callManagerSlackApi(manager, 'apps.manifest.delete', {
					app_id: managedAppId,
				});
				if (!response.ok && stringProperty(response, 'error') !== 'app_not_found') {
					throw this.methods.slackError('delete the Slack app', response);
				}
			} catch (error) {
				if (!(error instanceof NotFoundError)) throw error;
				warning = {
					integrationType: 'slack',
					code: 'app_not_deleted',
					action: {
						type: 'open_url',
						url: `https://api.slack.com/apps/${encodeURIComponent(managedAppId)}`,
					},
					details: { appId: managedAppId },
				};
			}
		}

		if (managerCredentialId && typeof data.teamId === 'string') {
			await this.cacheService.delete(
				this.managedAppCacheKey({
					projectId: options.projectId,
					agentId: options.agentId,
					managerCredentialId,
					workspaceId: data.teamId,
					userId: options.user.id,
				}),
			);
		}

		if (credential.isManaged || managedAppId) {
			await this.credentialsService.delete(options.user, credential.id);
		}
		return warning;
	}

	private assertSetupAvailable(): void {
		if (!this.isSetupAvailable()) {
			throw new NotFoundError('Managed Slack setup is not available');
		}
	}

	private async getManagedBotCredentialContext(
		options: GetManagedSlackAppSettingsOptions,
	): Promise<ManagedBotCredentialContext> {
		const agent = await this.methods.getAgent(options.agentId, options.projectId);
		const integration = agent.integrations?.find(
			(item) => item.type === 'slack' && item.credentialId === options.credentialId,
		);
		if (!integration) throw new NotFoundError('Managed Slack connection not found');

		const credential = await this.credentialsFinderService.findCredentialForUser(
			options.credentialId,
			options.user,
			['credential:read'],
		);
		if (!credential || credential.type !== SLACK_CREDENTIAL_TYPE) {
			throw new NotFoundError(`Credential "${options.credentialId}" not found`);
		}
		const rawData = await this.credentialsService.decrypt(credential, true);
		const managedAppId = stringProperty(rawData, 'managedAppId');
		const managerCredentialId = stringProperty(rawData, 'managerCredentialId');
		const teamId = stringProperty(rawData, 'teamId');
		if (!managedAppId || !managerCredentialId || !teamId) {
			throw new BadRequestError('The Slack connection is not managed by n8n');
		}
		return { credential, rawData, managedAppId, managerCredentialId, teamId };
	}

	private async exportManagedAppManifest(
		manager: ManagerCredentialContext,
		managedAppId: string,
	): Promise<Record<string, unknown>> {
		const response = await this.callManagerSlackApi(manager, 'apps.manifest.export', {
			app_id: managedAppId,
		});
		if (!response.ok) {
			throw this.methods.slackError('load the Slack app settings', response);
		}
		const manifest = childRecord(response, 'manifest');
		if (!manifest) throw new BadRequestError('Slack returned an incomplete app manifest');
		return manifest;
	}

	private managedAppSettingsFromManifest(
		credentialId: string,
		appId: string,
		manifest: Record<string, unknown>,
	): SlackManagedAppSettings {
		const displayInformation = childRecord(manifest, 'display_information');
		const features = childRecord(manifest, 'features');
		const botUser = features ? childRecord(features, 'bot_user') : undefined;
		const name = stringProperty(botUser, 'display_name');
		const description = stringProperty(displayInformation, 'description');
		if (!name || !description || typeof botUser?.always_online !== 'boolean') {
			throw new BadRequestError('Slack returned incomplete managed app settings');
		}
		return {
			credentialId,
			appId,
			name,
			description,
			alwaysOnline: botUser.always_online,
			appHomeUrl: `https://api.slack.com/apps/${encodeURIComponent(appId)}/app-home`,
		};
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
		integrations: readonly AgentIntegrationConfig[],
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
					: await this.methods.callSlackApi('auth.teams.list', {
							token: manager.accessToken,
							limit: '100',
							...(cursor ? { cursor } : {}),
						});
				if (!response.ok) break;
				if (Array.isArray(response.teams)) {
					workspaceRecords.push(...response.teams.filter(isRecord));
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
			const existing = await this.findManagedBotCredential(
				integrations,
				id,
				manager.credential.id,
				user,
			);
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
		integrations: readonly AgentIntegrationConfig[],
		workspaceId: string,
		managerCredentialId: string,
		user: User,
	): Promise<{ appId: string; credentialId: string } | undefined> {
		for (const integration of integrations) {
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
		workspaceName: string,
	): Promise<{ session: ManagedSlackAppSession; created: boolean }> {
		const key = this.managedAppCacheKey({ ...options, userId: options.user.id });
		const cached = await this.cacheService.get<unknown>(key);
		if (typeof cached === 'string') {
			const session = await this.decryptManagedAppSession(cached);
			if (session) {
				return {
					session: { ...session, teamName: session.teamName ?? workspaceName },
					created: false,
				};
			}
			// invalid session, delete it
			await this.cacheService.delete(key);
		}

		const redirectUrl = this.methods.callbackUrl(options.projectId, options.agentId);
		const manifest = this.methods.buildManifest(agent.name, options.projectId, options.agentId, {
			redirectUrl,
			managed: true,
		});
		const response = await this.callManagerSlackApi(manager, 'apps.manifest.create', {
			manifest: JSON.stringify(manifest),
			team_id: options.workspaceId,
		});
		if (!response.ok) throw this.methods.slackError('create the Slack app', response);

		const credentials = childRecord(response, 'credentials');
		const appId = stringProperty(response, 'app_id');
		const clientId = stringProperty(credentials, 'client_id');
		const clientSecret = stringProperty(credentials, 'client_secret');
		const signingSecret = stringProperty(credentials, 'signing_secret');
		const oauthAuthorizeUrl = stringProperty(response, 'oauth_authorize_url');
		try {
			if (!appId || !clientId || !clientSecret || !signingSecret || !oauthAuthorizeUrl) {
				throw new BadRequestError('Slack returned an incomplete app setup response');
			}
			await this.setManagedAppIcon(manager, appId);

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
				teamName: workspaceName,
				oauthAuthorizeUrl,
			} satisfies ManagedSlackAppSession;
			await this.cacheService.set(
				key,
				await this.cipher.encryptV2(JSON.stringify(session)),
				SLACK_APP_SETUP_TTL_MS,
			);
			return { session, created: true };
		} catch (error) {
			if (appId) {
				await Promise.allSettled([
					this.callManagerSlackApi(manager, 'apps.manifest.delete', { app_id: appId }),
					this.cacheService.delete(key),
				]);
			}
			throw error;
		}
	}

	private async decryptManagedAppSession(
		value: string,
	): Promise<ManagedSlackAppSession | undefined> {
		try {
			const decrypted = await this.cipher.decryptV2(value);
			const session = jsonParse<unknown>(decrypted, { fallbackValue: null });
			if (hasManagedSessionShape(session)) return session;
		} catch {
			// Ignore stale or undecryptable managed setup state.
		}
		return undefined;
	}

	private async callManagerSlackApi<T extends { [key: string]: unknown }>(
		manager: ManagerCredentialContext,
		method: string,
		params: Record<string, string> | SlackApiParamsFactory,
	): Promise<({ ok: true } & T) | { ok: false; error: string }> {
		const paramsForToken = (accessToken: string): SlackApiParams =>
			typeof params === 'function' ? params(accessToken) : { ...params, token: accessToken };
		let response = await this.methods.callSlackApi(method, paramsForToken(manager.accessToken));
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

		const refreshResponse = await this.methods.callSlackApi<RefreshTokenResponse>(
			'oauth.v2.access',
			{
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
				client_id: overwrite.clientId,
				client_secret: overwrite.clientSecret,
			},
		);
		const refreshedAccessToken = stringProperty(refreshResponse, 'access_token');
		if (!refreshResponse.ok || !refreshedAccessToken) {
			return response;
		}

		const refreshedAuthedUser: Record<string, unknown> = {
			...authedUser,
			access_token: refreshedAccessToken,
		};
		const refreshedUserId = stringProperty(refreshResponse, 'user_id');
		const refreshedScope = stringProperty(refreshResponse, 'scope');
		const refreshedRefreshToken = stringProperty(refreshResponse, 'refresh_token');
		const refreshedTokenType = stringProperty(refreshResponse, 'token_type');

		if (refreshedUserId !== undefined) refreshedAuthedUser.id = refreshedUserId;
		if (refreshedScope !== undefined) refreshedAuthedUser.scope = refreshedScope;
		if (refreshedRefreshToken !== undefined) {
			refreshedAuthedUser.refresh_token = refreshedRefreshToken;
		}
		if (refreshedTokenType !== undefined) refreshedAuthedUser.token_type = refreshedTokenType;
		if (typeof refreshResponse.expires_in === 'number') {
			refreshedAuthedUser.expires_in = refreshResponse.expires_in;
		}
		const oauthTokenData = {
			...manager.oauthTokenData,
			authed_user: refreshedAuthedUser,
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
		response = await this.methods.callSlackApi(method, paramsForToken(refreshedAccessToken));
		return response;
	}

	private managedAppCacheKey(options: {
		projectId: string;
		agentId: string;
		managerCredentialId: string;
		workspaceId: string;
		userId: string;
	}): string {
		return `${SLACK_MANAGED_APP_CACHE_PREFIX}${options.projectId}:${options.agentId}:${options.managerCredentialId}:${options.workspaceId}:${options.userId}`;
	}

	private async setManagedAppIcon(
		manager: ManagerCredentialContext,
		managedAppId: string,
	): Promise<void> {
		const image = await readFile(join(__dirname, 'assets', 'n8n-bot-icon.png'));
		const response = await this.callManagerSlackApi(manager, 'apps.icon.set', (accessToken) => {
			const formData = new FormData();
			formData.set('token', accessToken);
			formData.set('app_id', managedAppId);
			formData.set(
				'file',
				new Blob([new Uint8Array(image)], { type: 'image/png' }),
				'n8n-bot-icon.png',
			);
			return formData;
		});
		if (!response.ok) {
			throw this.methods.slackError('set the Slack app icon', response);
		}
	}
}

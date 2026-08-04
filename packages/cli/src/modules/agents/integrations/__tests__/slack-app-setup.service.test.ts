import type { Mock, Mocked } from 'vitest';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { CredentialsEntity, User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { Cipher } from 'n8n-core';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsOverwrites } from '@/credentials-overwrites';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { CacheService } from '@/services/cache/cache.service';
import type { UrlService } from '@/services/url.service';

import type { AgentIntegrationPersistenceService } from '../../agent-integration-persistence.service';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { ChatIntegrationService } from '../chat-integration.service';
import {
	SlackManagedSetupService,
	type DeleteManagedSlackAppOptions,
	type GetManagedSetupStateOptions,
	type GetManagedSlackAppSettingsOptions,
	type InstallManagedSlackAppOptions,
	type UpdateManagedSlackAppSettingsOptions,
} from '../platforms/slack/slack-managed-setup.service';
import {
	SlackManualSetupService,
	type CompleteSlackAppInstallOptions,
	type CreateSlackAppOptions,
	type GetSlackAppManifestOptions,
} from '../platforms/slack/slack-manual-setup.service';
import { SlackMethodsService } from '../platforms/slack/slack-methods.service';

const agent = {
	id: 'agent-1',
	projectId: 'project-1',
	name: 'Support Agent',
	activeVersionId: 'v1',
	activeVersion: {},
	integrations: [],
};

const unpublishedAgent = {
	...agent,
	activeVersionId: null,
	activeVersion: null,
};

const user = { id: 'user-1' } as User;

function slackResponse(body: Record<string, unknown>) {
	return { statusCode: 200, body };
}

function slackAppCreatedResponse() {
	return slackResponse({
		ok: true,
		app_id: 'A123',
		credentials: {
			client_id: 'C123',
			client_secret: 'client-secret',
			signing_secret: 'signing-secret',
		},
		oauth_authorize_url: 'https://slack.com/oauth/v2/authorize?client_id=C123&scope=chat%3Awrite',
	});
}

function slackOAuthResponse() {
	return slackResponse({
		ok: true,
		access_token: 'xoxb-installed-token',
		token_type: 'bot',
		app_id: 'A123',
	});
}

function fetchParams(requestMock: Mock, callIndex: number) {
	const request = requestMock.mock.calls[callIndex]?.[0] as {
		headers?: Record<string, string>;
		body: Record<string, string>;
	};
	// The body is passed as a plain object; OutboundHttp/axios only serializes it as
	// form-urlencoded when this content-type is set, so assert the contract here.
	expect(request.headers?.['content-type']).toBe('application/x-www-form-urlencoded');
	return new URLSearchParams(request.body);
}

describe('Slack setup services', () => {
	let requestMock: Mock;
	let outboundHttp: Mocked<OutboundHttp>;
	let cacheStore: Map<string, unknown>;
	let cacheService: Mocked<CacheService>;
	let cipher: Mocked<Cipher>;
	let credentialsService: Mocked<CredentialsService>;
	let credentialsFinderService: Mocked<CredentialsFinderService>;
	let credentialsOverwrites: Mocked<CredentialsOverwrites>;
	let userRepository: Mocked<UserRepository>;
	let agentRepository: Mocked<AgentRepository>;
	let agentIntegrationPersistenceService: Mocked<
		Pick<AgentIntegrationPersistenceService, 'saveCredentialIntegration'>
	>;
	let chatIntegrationService: Mocked<ChatIntegrationService>;
	let service: {
		createApp: SlackManualSetupService['createApp'];
		getManualManifest: (
			options: GetSlackAppManifestOptions,
		) => ReturnType<SlackManualSetupService['getManifest']>;
		completeInstall: (options: CompleteSlackAppInstallOptions) => Promise<void>;
		isManagedSetupAvailable: SlackManagedSetupService['isSetupAvailable'];
		createManagerCredential: (
			options: GetManagedSetupStateOptions,
		) => ReturnType<SlackManagedSetupService['createManagerCredential']>;
		getManagedSetupState: (
			options: GetManagedSetupStateOptions,
		) => ReturnType<SlackManagedSetupService['getSetupState']>;
		installManagedApp: (
			options: InstallManagedSlackAppOptions,
		) => ReturnType<SlackManagedSetupService['installApp']>;
		getManagedAppSettings: (
			options: GetManagedSlackAppSettingsOptions,
		) => ReturnType<SlackManagedSetupService['getAppSettings']>;
		updateManagedAppSettings: (
			options: UpdateManagedSlackAppSettingsOptions,
		) => ReturnType<SlackManagedSetupService['updateAppSettings']>;
		deleteManagedAppForCredential: (
			options: DeleteManagedSlackAppOptions,
		) => ReturnType<SlackManagedSetupService['deleteAppForCredential']>;
	};

	beforeEach(() => {
		const httpClient = mock<HttpRequestClient>();
		requestMock = httpClient.request as Mock;
		outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(httpClient);

		cacheStore = new Map<string, unknown>();
		cacheService = mock<CacheService>();
		cacheService.set.mockImplementation(async (key: string, value: unknown) => {
			cacheStore.set(key, value);
		});
		cacheService.get.mockImplementation(async (key: string) => cacheStore.get(key));
		cacheService.take.mockImplementation(async (key: string) => {
			const value = cacheStore.get(key);
			cacheStore.delete(key);
			return value;
		});
		cacheService.delete.mockImplementation(async (key: string) => {
			cacheStore.delete(key);
		});

		cipher = mock<Cipher>();
		cipher.encryptV2.mockImplementation(async (data: string | object) => {
			const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
			return `encrypted:${Buffer.from(plaintext).toString('base64')}`;
		});
		cipher.decryptV2.mockImplementation(async (data: string) =>
			Buffer.from(data.replace(/^encrypted:/, ''), 'base64').toString(),
		);

		credentialsService = mock<CredentialsService>();
		credentialsFinderService = mock<CredentialsFinderService>();
		credentialsOverwrites = mock<CredentialsOverwrites>();
		userRepository = mock<UserRepository>();
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);
		agentIntegrationPersistenceService =
			mock<Pick<AgentIntegrationPersistenceService, 'saveCredentialIntegration'>>();
		chatIntegrationService = mock<ChatIntegrationService>();
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://hooks.example/');
		urlService.getInstanceBaseUrl.mockReturnValue('https://hooks.example');

		const methods = new SlackMethodsService(
			cacheService,
			cipher,
			credentialsService,
			agentRepository,
			agentIntegrationPersistenceService as unknown as AgentIntegrationPersistenceService,
			chatIntegrationService,
			urlService,
			outboundHttp,
		);
		const manualService = new SlackManualSetupService(
			methods,
			userRepository,
			cacheService,
			cipher,
		);
		const managedService = new SlackManagedSetupService(
			methods,
			cacheService,
			cipher,
			credentialsService,
			credentialsFinderService,
			credentialsOverwrites,
			agentRepository,
		);
		service = {
			createApp: async (options: CreateSlackAppOptions) => await manualService.createApp(options),
			getManualManifest: async (options) => await manualService.getManifest(options),
			completeInstall: async (options) => await manualService.completeInstall(options),
			isManagedSetupAvailable: () => managedService.isSetupAvailable(),
			createManagerCredential: async (options) =>
				await managedService.createManagerCredential(options),
			getManagedSetupState: async (options) => await managedService.getSetupState(options),
			installManagedApp: async (options) => await managedService.installApp(options),
			getManagedAppSettings: async (options) => await managedService.getAppSettings(options),
			updateManagedAppSettings: async (options) => await managedService.updateAppSettings(options),
			deleteManagedAppForCredential: async (options) =>
				await managedService.deleteAppForCredential(options),
		};
	});

	async function beginInstall() {
		requestMock.mockResolvedValueOnce(slackAppCreatedResponse());
		const { installUrl } = await service.createApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'xoxe-config',
			user,
		});
		return new URL(installUrl).searchParams.get('state') ?? '';
	}

	it('creates a Slack app from an agent manifest and returns an install URL with state', async () => {
		requestMock.mockResolvedValueOnce(slackAppCreatedResponse());

		const result = await service.createApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'xoxe-config',
			user,
		});

		expect(requestMock).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'https://slack.com/api/apps.manifest.create',
				method: 'POST',
				headers: expect.objectContaining({
					'content-type': 'application/x-www-form-urlencoded',
				}),
			}),
		);

		const createParams = fetchParams(requestMock, 0);
		expect(createParams.get('token')).toBe('xoxe-config');
		const manifest = JSON.parse(createParams.get('manifest') ?? '') as {
			features: {
				app_home: {
					home_tab_enabled: boolean;
					messages_tab_enabled: boolean;
					messages_tab_read_only_enabled: boolean;
				};
			};
			oauth_config: { redirect_urls: string[]; scopes: { bot: string[] } };
			settings: {
				event_subscriptions: { request_url: string; bot_events: string[] };
				interactivity: { is_enabled: boolean; request_url: string };
				socket_mode_enabled: boolean;
				token_rotation_enabled: boolean;
			};
		};
		const webhookUrl =
			'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack';
		const callbackUrl =
			'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/integrations/slack/oauth/callback';
		expect(manifest.oauth_config.redirect_urls).toEqual([callbackUrl]);
		expect(manifest.features.app_home).toEqual({
			home_tab_enabled: false,
			messages_tab_enabled: true,
			messages_tab_read_only_enabled: false,
		});
		expect(manifest.oauth_config.scopes.bot).toEqual(
			expect.arrayContaining(['channels:history', 'groups:history', 'im:history', 'mpim:history']),
		);
		expect(manifest.settings.event_subscriptions.request_url).toBe(webhookUrl);
		expect(manifest.settings.event_subscriptions.bot_events).toEqual([
			'app_mention',
			'assistant_thread_started',
			'assistant_thread_context_changed',
			'message.channels',
			'message.groups',
			'message.im',
			'message.mpim',
		]);
		expect(manifest.settings.interactivity).toEqual({
			is_enabled: true,
			request_url: webhookUrl,
		});
		expect(manifest.settings.socket_mode_enabled).toBe(false);
		expect(manifest.settings.token_rotation_enabled).toBe(false);

		expect(result.appId).toBe('A123');
		const installUrl = new URL(result.installUrl);
		const state = installUrl.searchParams.get('state');
		expect(state).toBeTruthy();
		expect(installUrl.searchParams.get('redirect_uri')).toBe(callbackUrl);
		expect(cacheService.set).toHaveBeenCalledWith(
			`agents:slack-app-setup:${state}`,
			expect.stringMatching(/^encrypted:/),
			60 * 60 * 1000,
		);
		const cachedSession = cacheStore.get(`agents:slack-app-setup:${state}`);
		expect(cachedSession).not.toEqual(expect.objectContaining({ clientSecret: 'client-secret' }));
		expect(String(cachedSession)).not.toContain('client-secret');
		expect(String(cachedSession)).not.toContain('signing-secret');

		const plaintextSession = JSON.parse(cipher.encryptV2.mock.calls[0]?.[0] as string) as {
			agentId: string;
			projectId: string;
			userId: string;
			appId: string;
			clientId: string;
			clientSecret: string;
			signingSecret: string;
			redirectUrl: string;
		};
		expect(plaintextSession).toEqual({
			agentId: 'agent-1',
			projectId: 'project-1',
			userId: 'user-1',
			appId: 'A123',
			clientId: 'C123',
			clientSecret: 'client-secret',
			signingSecret: 'signing-secret',
			redirectUrl: callbackUrl,
		});
		expect(credentialsService.createManagedCredential).not.toHaveBeenCalled();
		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});

	it('returns the manual Slack app manifest without OAuth redirect URLs', async () => {
		const result = await service.getManualManifest({
			projectId: 'project-1',
			agentId: 'agent-1',
		});

		expect(result.manifest.display_information.name).toBe('Support Agent');
		expect(result.manifest.features.app_home).toEqual({
			home_tab_enabled: false,
			messages_tab_enabled: true,
			messages_tab_read_only_enabled: false,
		});
		expect(result.manifest.oauth_config).not.toHaveProperty('redirect_urls');
		expect(result.manifest.oauth_config.scopes.bot).toContain('chat:write');
		expect(result.manifest.settings.event_subscriptions.request_url).toBe(
			'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
		);
		expect(result.manifest.settings.interactivity).toEqual({
			is_enabled: true,
			request_url: 'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
		});
		expect(requestMock).not.toHaveBeenCalled();
	});

	it('saves, connects, and broadcasts a Slack integration for a published agent', async () => {
		requestMock.mockResolvedValueOnce(slackAppCreatedResponse()).mockResolvedValueOnce(
			slackResponse({
				ok: true,
				access_token: 'xoxb-installed-token',
				token_type: 'bot',
				app_id: 'A123',
			}),
		);
		userRepository.findOne.mockResolvedValue(user);
		credentialsService.createUnmanagedCredential.mockResolvedValue({ id: 'cred-slack' } as never);
		agentIntegrationPersistenceService.saveCredentialIntegration.mockResolvedValue(agent as never);

		const { installUrl } = await service.createApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'xoxe-config',
			user,
		});
		const state = new URL(installUrl).searchParams.get('state');
		expect(state).toBeTruthy();
		const encryptedSession = cacheStore.get(`agents:slack-app-setup:${state}`);

		await service.completeInstall({
			projectId: 'project-1',
			agentId: 'agent-1',
			code: 'slack-code',
			state: state ?? '',
		});

		const tokenRequest = requestMock.mock.calls[1]?.[0] as {
			url: string;
			headers: Record<string, string>;
		};
		expect(tokenRequest.url).toBe('https://slack.com/api/oauth.v2.access');
		expect(tokenRequest.headers).toEqual(
			expect.objectContaining({
				authorization: `Basic ${Buffer.from('C123:client-secret').toString('base64')}`,
				'content-type': 'application/x-www-form-urlencoded',
			}),
		);
		const tokenParams = fetchParams(requestMock, 1);
		expect(tokenParams.get('code')).toBe('slack-code');
		expect(tokenParams.get('redirect_uri')).toBe(
			'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/integrations/slack/oauth/callback',
		);

		expect(userRepository.findOne).toHaveBeenCalledWith({
			where: { id: 'user-1' },
			relations: ['role'],
		});
		expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
			{
				name: 'Slack - Support Agent',
				type: 'slackApi',
				data: {
					accessToken: 'xoxb-installed-token',
					signatureSecret: 'signing-secret',
				},
				projectId: 'project-1',
			},
			user,
		);
		const integration = { type: 'slack', credentialId: 'cred-slack' };
		expect(chatIntegrationService.connect).toHaveBeenCalledWith(
			'agent-1',
			integration,
			'project-1',
		);
		expect(agentIntegrationPersistenceService.saveCredentialIntegration).toHaveBeenCalledWith(
			agent,
			integration,
			{
				user,
				modifiedBy: 'user',
				broadcast: false,
			},
		);
		expect(chatIntegrationService.broadcastIntegrationChange).toHaveBeenCalledWith(
			'agent-1',
			integration,
			'connect',
		);
		expect(
			agentIntegrationPersistenceService.saveCredentialIntegration.mock.invocationCallOrder[0],
		).toBeLessThan(chatIntegrationService.connect.mock.invocationCallOrder[0]);
		expect(chatIntegrationService.connect.mock.invocationCallOrder[0]).toBeLessThan(
			chatIntegrationService.broadcastIntegrationChange.mock.invocationCallOrder[0],
		);
		expect(cacheService.take).toHaveBeenCalledWith(`agents:slack-app-setup:${state}`);
		expect(cipher.decryptV2).toHaveBeenCalledWith(encryptedSession);
		await expect(
			service.completeInstall({
				projectId: 'project-1',
				agentId: 'agent-1',
				code: 'slack-code',
				state: state ?? '',
			}),
		).rejects.toThrow('expired or is invalid');
	});

	it('does not broadcast when connecting a published Slack install fails', async () => {
		const state = await beginInstall();
		requestMock.mockResolvedValueOnce(slackOAuthResponse());
		userRepository.findOne.mockResolvedValue(user);
		credentialsService.createUnmanagedCredential.mockResolvedValue({ id: 'cred-slack' } as never);
		agentIntegrationPersistenceService.saveCredentialIntegration.mockResolvedValue(agent as never);
		const connectError = new Error('Slack connect failed');
		chatIntegrationService.connect.mockRejectedValue(connectError);

		await expect(
			service.completeInstall({
				projectId: 'project-1',
				agentId: 'agent-1',
				code: 'slack-code',
				state,
			}),
		).rejects.toBe(connectError);

		expect(agentIntegrationPersistenceService.saveCredentialIntegration).toHaveBeenCalledWith(
			agent,
			{ type: 'slack', credentialId: 'cred-slack' },
			{ user, modifiedBy: 'user', broadcast: false },
		);
		expect(chatIntegrationService.connect).toHaveBeenCalledWith(
			'agent-1',
			{ type: 'slack', credentialId: 'cred-slack' },
			'project-1',
		);
		expect(
			agentIntegrationPersistenceService.saveCredentialIntegration.mock.invocationCallOrder[0],
		).toBeLessThan(chatIntegrationService.connect.mock.invocationCallOrder[0]);
		expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('saves without connecting or broadcasting for an unpublished agent', async () => {
		agentRepository.findByIdAndProjectId
			.mockResolvedValueOnce(agent as never)
			.mockResolvedValueOnce(unpublishedAgent as never);
		agentIntegrationPersistenceService.saveCredentialIntegration.mockResolvedValue(
			unpublishedAgent as never,
		);
		requestMock.mockResolvedValueOnce(slackAppCreatedResponse()).mockResolvedValueOnce(
			slackResponse({
				ok: true,
				access_token: 'xoxb-installed-token',
				token_type: 'bot',
				app_id: 'A123',
			}),
		);
		userRepository.findOne.mockResolvedValue(user);
		credentialsService.createUnmanagedCredential.mockResolvedValue({ id: 'cred-slack' } as never);

		const { installUrl } = await service.createApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'xoxe-config',
			user,
		});
		const state = new URL(installUrl).searchParams.get('state') ?? '';

		await service.completeInstall({
			projectId: 'project-1',
			agentId: 'agent-1',
			code: 'slack-code',
			state,
		});

		const integration = { type: 'slack', credentialId: 'cred-slack' };
		expect(agentIntegrationPersistenceService.saveCredentialIntegration).toHaveBeenCalledWith(
			unpublishedAgent,
			integration,
			{
				user,
				modifiedBy: 'user',
				broadcast: false,
			},
		);
		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
		expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('rejects a callback state that does not belong to the requested project and agent', async () => {
		requestMock.mockResolvedValueOnce(slackAppCreatedResponse());

		const { installUrl } = await service.createApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'xoxe-config',
			user,
		});
		const state = new URL(installUrl).searchParams.get('state') ?? '';

		await expect(
			service.completeInstall({
				projectId: 'project-2',
				agentId: 'agent-1',
				code: 'slack-code',
				state,
			}),
		).rejects.toThrow(BadRequestError);
		expect(credentialsService.createManagedCredential).not.toHaveBeenCalled();
		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});

	it.each([
		[undefined, false],
		[{ clientId: 'client', clientSecret: 'secret', userScope: 'app_configurations:write' }, false],
		[
			{
				clientId: 'client',
				clientSecret: 'secret',
				userScope:
					'channels:read app_configurations:read app_configurations:write managed_apps:install',
			},
			true,
		],
	])('gates managed setup from the complete Slack OAuth overwrite', (overwrite, expected) => {
		credentialsOverwrites.getOverwrites.mockReturnValue(overwrite);

		expect(service.isManagedSetupAvailable()).toBe(expected);
	});

	it('creates a project-scoped Slack manager OAuth credential', async () => {
		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client',
			clientSecret: 'secret',
			userScope: 'app_configurations:read app_configurations:write managed_apps:install',
		});
		credentialsService.createUnmanagedCredential.mockResolvedValue({
			id: 'manager',
			name: 'Slack workspace manager',
		} as never);

		await expect(
			service.createManagerCredential({
				projectId: 'project-1',
				agentId: 'agent-1',
				user,
			}),
		).resolves.toEqual({
			id: 'manager',
			name: 'Slack workspace manager',
			type: 'slackManagerOAuth2Api',
			isResolvable: false,
		});
		expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
			{
				name: 'Slack workspace manager',
				type: 'slackManagerOAuth2Api',
				data: {},
				projectId: 'project-1',
			},
			user,
		);
	});

	it('returns managed Slack setup before the agent is persisted', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client',
			clientSecret: 'secret',
			userScope: 'app_configurations:read app_configurations:write managed_apps:install',
		});
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'managed', type: 'slackManagerOAuth2Api', name: 'Managed Slack' },
			{ id: 'custom', type: 'slackManagerOAuth2Api', name: 'Custom Slack' },
			{ id: 'bot', type: 'slackApi', name: 'Slack Bot' },
		] as never);
		const managedCredential = {
			id: 'managed',
			name: 'Managed Slack',
			type: 'slackManagerOAuth2Api',
		} as CredentialsEntity;
		const customCredential = {
			id: 'custom',
			name: 'Custom Slack',
			type: 'slackManagerOAuth2Api',
		} as CredentialsEntity;
		credentialsFinderService.findCredentialForUser
			.mockResolvedValueOnce(managedCredential)
			.mockResolvedValueOnce(customCredential);
		const managedData = {
			oauthTokenData: {
				authed_user: {
					id: 'U123',
					access_token: 'xoxp-manager',
					scope: 'app_configurations:read,app_configurations:write,managed_apps:install',
				},
				team: { id: 'T123', name: 'Example workspace' },
			},
		};
		credentialsService.decrypt
			.mockResolvedValueOnce(managedData)
			.mockResolvedValueOnce({ clientId: 'custom-client' });
		credentialsOverwrites.usesManagedAuth.mockImplementation((_type, data) => data === managedData);

		await expect(
			service.getManagedSetupState({
				projectId: 'project-1',
				agentId: 'agent-1',
				user,
			}),
		).resolves.toEqual({
			managedSetupAvailable: true,
			managerCredentials: [
				{
					id: 'managed',
					name: 'Managed Slack',
					connected: true,
					reconnectRequired: false,
					workspaces: [
						{
							id: 'T123',
							name: 'Example workspace',
							connected: false,
						},
					],
				},
			],
		});
	});

	it('refreshes the manager token and auto-installs with a project-owned bot credential', async () => {
		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client',
			clientSecret: 'secret',
			userScope: 'app_configurations:read app_configurations:write managed_apps:install',
		});
		credentialsOverwrites.usesManagedAuth.mockReturnValue(true);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		] as never);
		const managerCredential = {
			id: 'manager',
			name: 'Slack manager',
			type: 'slackManagerOAuth2Api',
		} as CredentialsEntity;
		credentialsFinderService.findCredentialForUser.mockResolvedValue(managerCredential);
		credentialsService.decrypt.mockResolvedValue({
			oauthTokenData: {
				authed_user: {
					access_token: 'xoxp-manager',
					refresh_token: 'xoxe-manager',
					scope: 'app_configurations:read app_configurations:write managed_apps:install',
				},
				team: { id: 'T123', name: 'Example workspace' },
			},
		});
		requestMock
			.mockResolvedValueOnce(slackAppCreatedResponse())
			.mockResolvedValueOnce(slackResponse({ ok: true }))
			.mockResolvedValueOnce(slackResponse({ ok: false, error: 'token_expired' }))
			.mockResolvedValueOnce(
				slackResponse({
					ok: true,
					authed_user: {
						access_token: 'xoxp-refreshed',
						refresh_token: 'xoxe-refreshed',
					},
				}),
			)
			.mockResolvedValueOnce(
				slackResponse({
					ok: true,
					app_id: 'A123',
					api_access_tokens: { bot_access_token: 'xoxb-managed' },
				}),
			);
		credentialsService.createEncryptedData.mockResolvedValue({ data: 'encrypted' } as never);
		credentialsService.createManagedCredential.mockResolvedValue({
			id: 'bot-credential',
		} as never);
		agentIntegrationPersistenceService.saveCredentialIntegration.mockResolvedValue(agent as never);

		await expect(
			service.installManagedApp({
				projectId: 'project-1',
				agentId: 'agent-1',
				managerCredentialId: 'manager',
				workspaceId: 'T123',
				user,
			}),
		).resolves.toEqual({
			status: 'connected',
			appId: 'A123',
			credentialId: 'bot-credential',
		});

		const manifestParams = fetchParams(requestMock, 0);
		const manifest = JSON.parse(manifestParams.get('manifest') ?? '') as {
			display_information: { description: string };
			settings: { managed_app_settings: Record<string, unknown> };
		};
		expect(manifest.display_information.description).toContain('Support Agent');
		expect(manifest.settings.managed_app_settings).toEqual({
			is_install_from_slack_disabled: true,
			external_app_management_url: 'https://hooks.example/projects/project-1/agents/agent-1',
		});
		const iconRequest = requestMock.mock.calls[1]?.[0] as {
			url: string;
			body: FormData;
		};
		expect(iconRequest.url).toBe('https://slack.com/api/apps.icon.set');
		expect(iconRequest.body.get('app_id')).toBe('A123');
		expect(iconRequest.body.get('token')).toBe('xoxp-manager');
		expect(iconRequest.body.get('file')).toBeInstanceOf(Blob);
		expect(fetchParams(requestMock, 2).get('bot_scopes')).toContain('chat:write');
		expect(fetchParams(requestMock, 3).get('grant_type')).toBe('refresh_token');
		expect(fetchParams(requestMock, 4).get('token')).toBe('xoxp-refreshed');
		expect(credentialsService.update).toHaveBeenCalledWith(
			'manager',
			{ data: 'encrypted' },
			expect.objectContaining({
				oauthTokenData: expect.objectContaining({
					authed_user: expect.objectContaining({ access_token: 'xoxp-refreshed' }),
				}),
			}),
		);
		expect(credentialsService.createManagedCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Example workspace - Support Agent',
				projectId: 'project-1',
				type: 'slackApi',
				data: expect.objectContaining({
					accessToken: 'xoxb-managed',
					signatureSecret: 'signing-secret',
					managedAppId: 'A123',
					teamId: 'T123',
					managerCredentialId: 'manager',
				}),
			}),
			user,
		);
	});

	it('returns the child OAuth URL when managed installation needs approval', async () => {
		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client',
			clientSecret: 'secret',
			userScope: 'app_configurations:read app_configurations:write managed_apps:install',
		});
		credentialsOverwrites.usesManagedAuth.mockReturnValue(true);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		] as never);
		const managerCredential = {
			id: 'manager',
			name: 'Slack manager',
			type: 'slackManagerOAuth2Api',
		} as CredentialsEntity;
		credentialsFinderService.findCredentialForUser.mockResolvedValue(managerCredential);
		credentialsService.decrypt.mockResolvedValue({
			oauthTokenData: {
				authed_user: {
					access_token: 'xoxp-manager',
					scope: 'app_configurations:read app_configurations:write managed_apps:install',
				},
				team: { id: 'T123', name: 'Example workspace' },
			},
		});
		requestMock
			.mockResolvedValueOnce(slackAppCreatedResponse())
			.mockResolvedValueOnce(slackResponse({ ok: true }))
			.mockResolvedValueOnce(slackResponse({ ok: false, error: 'app_approval_request_eligible' }))
			.mockResolvedValueOnce(slackResponse({ ok: false, error: 'installation_denied' }));

		const result = await service.installManagedApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			managerCredentialId: 'manager',
			workspaceId: 'T123',
			user,
		});

		expect(result.status).toBe('manual_install_required');
		if (result.status === 'manual_install_required') {
			expect(new URL(result.installUrl).searchParams.get('state')).toBeTruthy();
		}
		await service.installManagedApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			managerCredentialId: 'manager',
			workspaceId: 'T123',
			user,
		});
		expect(
			requestMock.mock.calls.filter(
				([request]) => request.url === 'https://slack.com/api/apps.manifest.create',
			),
		).toHaveLength(1);
		expect(credentialsService.createManagedCredential).not.toHaveBeenCalled();
	});

	it('exports settings for a managed Slack bot credential', async () => {
		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client',
			clientSecret: 'secret',
			userScope: 'app_configurations:read app_configurations:write managed_apps:install',
		});
		credentialsOverwrites.usesManagedAuth.mockReturnValue(true);
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			...agent,
			integrations: [{ type: 'slack', credentialId: 'bot-credential' }],
		} as never);
		const botCredential = {
			id: 'bot-credential',
			name: 'Slack bot',
			type: 'slackApi',
		} as CredentialsEntity;
		const managerCredential = {
			id: 'manager',
			name: 'Slack manager',
			type: 'slackManagerOAuth2Api',
		} as CredentialsEntity;
		credentialsFinderService.findCredentialForUser
			.mockResolvedValueOnce(botCredential)
			.mockResolvedValueOnce(managerCredential);
		credentialsService.decrypt
			.mockResolvedValueOnce({
				managedAppId: 'A123',
				managerCredentialId: 'manager',
				teamId: 'T123',
			})
			.mockResolvedValueOnce({
				oauthTokenData: {
					authed_user: {
						access_token: 'xoxp-manager',
						scope: 'app_configurations:read app_configurations:write managed_apps:install',
					},
				},
			});
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		] as never);
		requestMock.mockResolvedValueOnce(
			slackResponse({
				ok: true,
				manifest: {
					display_information: { name: 'Slack app', description: 'Handles support requests' },
					features: {
						bot_user: { display_name: 'Support Bot', always_online: false },
					},
				},
			}),
		);

		await expect(
			service.getManagedAppSettings({
				projectId: 'project-1',
				agentId: 'agent-1',
				credentialId: 'bot-credential',
				user,
			}),
		).resolves.toEqual({
			credentialId: 'bot-credential',
			appId: 'A123',
			name: 'Support Bot',
			description: 'Handles support requests',
			alwaysOnline: false,
			appHomeUrl: 'https://api.slack.com/apps/A123/app-home',
		});
		expect(fetchParams(requestMock, 0).get('app_id')).toBe('A123');
	});

	it('updates the live manifest, reinstalls the app, and refreshes the bot token', async () => {
		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client',
			clientSecret: 'secret',
			userScope: 'app_configurations:read app_configurations:write managed_apps:install',
		});
		credentialsOverwrites.usesManagedAuth.mockReturnValue(true);
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			...agent,
			integrations: [{ type: 'slack', credentialId: 'bot-credential' }],
		} as never);
		const botCredential = {
			id: 'bot-credential',
			name: 'Slack bot',
			type: 'slackApi',
		} as CredentialsEntity;
		const managerCredential = {
			id: 'manager',
			name: 'Slack manager',
			type: 'slackManagerOAuth2Api',
		} as CredentialsEntity;
		credentialsFinderService.findCredentialForUser
			.mockResolvedValueOnce(botCredential)
			.mockResolvedValueOnce(managerCredential);
		credentialsService.decrypt
			.mockResolvedValueOnce({
				accessToken: 'xoxb-old',
				signatureSecret: 'signing-secret',
				managedAppId: 'A123',
				managerCredentialId: 'manager',
				teamId: 'T123',
			})
			.mockResolvedValueOnce({
				oauthTokenData: {
					authed_user: {
						access_token: 'xoxp-manager',
						scope: 'app_configurations:read app_configurations:write managed_apps:install',
					},
				},
			});
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		] as never);
		const manifest = {
			display_information: {
				name: 'App name stays unchanged',
				description: 'Old description',
				background_color: '#000000',
			},
			features: {
				app_home: { home_tab_enabled: true },
				bot_user: { display_name: 'Old Bot', always_online: true },
			},
			settings: { socket_mode_enabled: false },
		};
		requestMock
			.mockResolvedValueOnce(slackResponse({ ok: true, manifest }))
			.mockResolvedValueOnce(slackResponse({ ok: true }))
			.mockResolvedValueOnce(
				slackResponse({
					ok: true,
					api_access_tokens: { bot_access_token: 'xoxb-refreshed' },
				}),
			);
		credentialsService.createEncryptedData.mockResolvedValue({ data: 'encrypted' } as never);

		await expect(
			service.updateManagedAppSettings({
				projectId: 'project-1',
				agentId: 'agent-1',
				credentialId: 'bot-credential',
				name: 'New Bot',
				description: 'New description',
				alwaysOnline: false,
				user,
			}),
		).resolves.toEqual(
			expect.objectContaining({
				name: 'New Bot',
				description: 'New description',
				alwaysOnline: false,
			}),
		);

		const updatedManifest = JSON.parse(fetchParams(requestMock, 1).get('manifest') ?? '') as {
			display_information: Record<string, unknown>;
			features: Record<string, Record<string, unknown>>;
			settings: Record<string, unknown>;
		};
		expect(updatedManifest.display_information).toEqual({
			name: 'App name stays unchanged',
			description: 'New description',
			background_color: '#000000',
		});
		expect(updatedManifest.features.app_home).toEqual({ home_tab_enabled: false });
		expect(updatedManifest.features.bot_user).toEqual({
			display_name: 'New Bot',
			always_online: false,
		});
		expect(updatedManifest.settings).toEqual({ socket_mode_enabled: false });
		expect(fetchParams(requestMock, 2).get('team_id')).toBe('T123');
		expect(credentialsService.update).toHaveBeenCalledWith(
			'bot-credential',
			{ data: 'encrypted' },
			expect.objectContaining({
				accessToken: 'xoxb-refreshed',
				signatureSecret: 'signing-secret',
			}),
		);
	});

	it('rejects settings access for an unmanaged Slack credential', async () => {
		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client',
			clientSecret: 'secret',
			userScope: 'app_configurations:read app_configurations:write managed_apps:install',
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			...agent,
			integrations: [{ type: 'slack', credentialId: 'bot-credential' }],
		} as never);
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'bot-credential',
			type: 'slackApi',
		} as CredentialsEntity);
		credentialsService.decrypt.mockResolvedValue({ accessToken: 'xoxb-token' });

		await expect(
			service.getManagedAppSettings({
				projectId: 'project-1',
				agentId: 'agent-1',
				credentialId: 'bot-credential',
				user,
			}),
		).rejects.toThrow('The Slack connection is not managed by n8n');
		expect(requestMock).not.toHaveBeenCalled();
	});

	it('includes Slack error metadata in managed settings errors', async () => {
		credentialsOverwrites.getOverwrites.mockReturnValue({
			clientId: 'client',
			clientSecret: 'secret',
			userScope: 'app_configurations:read app_configurations:write managed_apps:install',
		});
		credentialsOverwrites.usesManagedAuth.mockReturnValue(true);
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			...agent,
			integrations: [{ type: 'slack', credentialId: 'bot-credential' }],
		} as never);
		credentialsFinderService.findCredentialForUser
			.mockResolvedValueOnce({
				id: 'bot-credential',
				type: 'slackApi',
			} as CredentialsEntity)
			.mockResolvedValueOnce({
				id: 'manager',
				type: 'slackManagerOAuth2Api',
			} as CredentialsEntity);
		credentialsService.decrypt
			.mockResolvedValueOnce({
				managedAppId: 'A123',
				managerCredentialId: 'manager',
				teamId: 'T123',
			})
			.mockResolvedValueOnce({
				oauthTokenData: {
					authed_user: {
						access_token: 'xoxp-manager',
						scope: 'app_configurations:read app_configurations:write managed_apps:install',
					},
				},
			});
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		] as never);
		requestMock.mockResolvedValueOnce(
			slackResponse({ ok: false, error: 'service_limits_exceeded' }),
		);

		await expect(
			service.getManagedAppSettings({
				projectId: 'project-1',
				agentId: 'agent-1',
				credentialId: 'bot-credential',
				user,
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining('service_limits_exceeded'),
			meta: {
				integrationType: 'slack',
				code: 'service_limits_exceeded',
			},
		});
	});

	it('deletes a managed Slack app associated with the bot credential', async () => {
		const botCredential = {
			id: 'bot-credential',
			name: 'Slack bot',
			type: 'slackApi',
		} as CredentialsEntity;
		const managerCredential = {
			id: 'manager',
			name: 'Slack manager',
			type: 'slackManagerOAuth2Api',
		} as CredentialsEntity;
		credentialsFinderService.findCredentialForUser
			.mockResolvedValueOnce(botCredential)
			.mockResolvedValueOnce(managerCredential);
		credentialsService.decrypt
			.mockResolvedValueOnce({
				managedAppId: 'A123',
				teamId: 'T123',
				managerCredentialId: 'manager',
			})
			.mockResolvedValueOnce({
				oauthTokenData: {
					authed_user: {
						access_token: 'xoxp-manager',
						scope: 'app_configurations:read app_configurations:write managed_apps:install',
					},
				},
			});
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'manager', type: 'slackManagerOAuth2Api' },
		] as never);
		credentialsOverwrites.usesManagedAuth.mockReturnValue(true);
		requestMock.mockResolvedValueOnce(slackResponse({ ok: true }));

		await service.deleteManagedAppForCredential({
			projectId: 'project-1',
			agentId: 'agent-1',
			credentialId: 'bot-credential',
			user,
		});

		expect(requestMock).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'https://slack.com/api/apps.manifest.delete',
			}),
		);
		expect(fetchParams(requestMock, 0).get('app_id')).toBe('A123');
		expect(fetchParams(requestMock, 0).get('token')).toBe('xoxp-manager');
		expect(credentialsService.delete).toHaveBeenCalledWith(user, 'bot-credential');
	});

	it('deletes the bot credential and returns a warning when its manager credential is missing', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValueOnce({
			id: 'bot-credential',
			name: 'Slack bot',
			type: 'slackApi',
			isManaged: true,
		} as CredentialsEntity);
		credentialsService.decrypt.mockResolvedValue({
			managedAppId: 'A123',
			teamId: 'T123',
			managerCredentialId: 'missing-manager',
		});
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		await expect(
			service.deleteManagedAppForCredential({
				projectId: 'project-1',
				agentId: 'agent-1',
				credentialId: 'bot-credential',
				user,
			}),
		).resolves.toEqual({
			integrationType: 'slack',
			code: 'app_not_deleted',
			action: { type: 'open_url', url: 'https://api.slack.com/apps/A123' },
			details: { appId: 'A123' },
		});
		expect(credentialsService.delete).toHaveBeenCalledWith(user, 'bot-credential');
		expect(requestMock).not.toHaveBeenCalled();
	});

	it('does not call Slack when the bot credential is not managed', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'bot-credential',
			name: 'Slack bot',
			type: 'slackApi',
		} as CredentialsEntity);
		credentialsService.decrypt.mockResolvedValue({ accessToken: 'xoxb-token' });

		await service.deleteManagedAppForCredential({
			projectId: 'project-1',
			agentId: 'agent-1',
			credentialId: 'bot-credential',
			user,
		});

		expect(requestMock).not.toHaveBeenCalled();
		expect(credentialsService.delete).not.toHaveBeenCalled();
	});

	it('deletes a managed bot credential without a managed Slack app', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'bot-credential',
			name: 'Slack bot',
			type: 'slackApi',
			isManaged: true,
		} as CredentialsEntity);
		credentialsService.decrypt.mockResolvedValue({ accessToken: 'xoxb-token' });

		await service.deleteManagedAppForCredential({
			projectId: 'project-1',
			agentId: 'agent-1',
			credentialId: 'bot-credential',
			user,
		});

		expect(requestMock).not.toHaveBeenCalled();
		expect(credentialsService.delete).toHaveBeenCalledWith(user, 'bot-credential');
	});
});

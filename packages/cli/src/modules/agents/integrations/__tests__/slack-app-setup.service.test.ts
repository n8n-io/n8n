import type { User, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { CacheService } from '@/services/cache/cache.service';
import type { UrlService } from '@/services/url.service';

import type { AgentsService } from '../../agents.service';
import type { ChatIntegrationService } from '../chat-integration.service';
import { SlackAppSetupService } from '../slack-app-setup.service';
import type { AgentRepository } from '../../repositories/agent.repository';

const agent = {
	id: 'agent-1',
	projectId: 'project-1',
	name: 'Support Agent',
	activeVersionId: 'v1',
	activeVersion: {},
	integrations: [],
};

const user = { id: 'user-1' } as User;

function slackResponse(body: Record<string, unknown>): Response {
	return {
		json: jest.fn().mockResolvedValue(body),
	} as unknown as Response;
}

function fetchParams(fetchMock: jest.Mock, callIndex: number) {
	const init = fetchMock.mock.calls[callIndex]?.[1] as RequestInit;
	return new URLSearchParams(String(init.body));
}

describe('SlackAppSetupService', () => {
	const originalFetch = global.fetch;
	let fetchMock: jest.Mock;
	let cacheStore: Map<string, unknown>;
	let cacheService: jest.Mocked<CacheService>;
	let cipher: jest.Mocked<Cipher>;
	let credentialsService: jest.Mocked<CredentialsService>;
	let userRepository: jest.Mocked<UserRepository>;
	let agentRepository: jest.Mocked<AgentRepository>;
	let agentsService: jest.Mocked<AgentsService>;
	let chatIntegrationService: jest.Mocked<ChatIntegrationService>;
	let service: SlackAppSetupService;

	beforeEach(() => {
		fetchMock = jest.fn();
		global.fetch = fetchMock as unknown as typeof fetch;

		cacheStore = new Map<string, unknown>();
		cacheService = mock<CacheService>();
		cacheService.set.mockImplementation(async (key: string, value: unknown) => {
			cacheStore.set(key, value);
		});
		cacheService.get.mockImplementation(async (key: string) => cacheStore.get(key));
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
		userRepository = mock<UserRepository>();
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);
		agentsService = mock<AgentsService>();
		chatIntegrationService = mock<ChatIntegrationService>();
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://hooks.example/');

		service = new SlackAppSetupService(
			cacheService,
			cipher,
			credentialsService,
			userRepository,
			agentRepository,
			agentsService,
			chatIntegrationService,
			urlService,
		);
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	it('creates a Slack app from an agent manifest and returns an install URL with state', async () => {
		fetchMock.mockResolvedValueOnce(
			slackResponse({
				ok: true,
				app_id: 'A123',
				credentials: {
					client_id: 'C123',
					client_secret: 'client-secret',
					signing_secret: 'signing-secret',
				},
				oauth_authorize_url:
					'https://slack.com/oauth/v2/authorize?client_id=C123&scope=chat%3Awrite',
			}),
		);

		const result = await service.createApp({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'xoxe-config',
			user,
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'https://slack.com/api/apps.manifest.create',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Type': 'application/x-www-form-urlencoded',
				}),
			}),
		);

		const createParams = fetchParams(fetchMock, 0);
		expect(createParams.get('token')).toBe('xoxe-config');
		const manifest = JSON.parse(createParams.get('manifest') ?? '') as {
			features: {
				app_home: {
					home_tab_enabled: boolean;
					messages_tab_enabled: boolean;
					messages_tab_read_only_enabled: boolean;
				};
			};
			oauth_config: { redirect_urls: string[] };
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
			home_tab_enabled: true,
			messages_tab_enabled: true,
			messages_tab_read_only_enabled: false,
		});
		expect(manifest.settings.event_subscriptions.request_url).toBe(webhookUrl);
		expect(manifest.settings.event_subscriptions.bot_events).toEqual([
			'app_mention',
			'assistant_thread_context_changed',
			'message.im',
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
		expect(credentialsService.createUnmanagedCredential).not.toHaveBeenCalled();
		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});

	it('returns the manual Slack app manifest without OAuth redirect URLs', async () => {
		const result = await service.getManualManifest({
			projectId: 'project-1',
			agentId: 'agent-1',
		});

		expect(result.manifest.display_information.name).toBe('Support Agent');
		expect(result.manifest.features.app_home).toEqual({
			home_tab_enabled: true,
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
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('exchanges the OAuth code, creates a Slack API credential, and connects the agent', async () => {
		fetchMock
			.mockResolvedValueOnce(
				slackResponse({
					ok: true,
					app_id: 'A123',
					credentials: {
						client_id: 'C123',
						client_secret: 'client-secret',
						signing_secret: 'signing-secret',
					},
					oauth_authorize_url:
						'https://slack.com/oauth/v2/authorize?client_id=C123&scope=chat%3Awrite',
				}),
			)
			.mockResolvedValueOnce(
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
		const state = new URL(installUrl).searchParams.get('state');
		expect(state).toBeTruthy();
		const encryptedSession = cacheStore.get(`agents:slack-app-setup:${state}`);

		await service.completeInstall({
			projectId: 'project-1',
			agentId: 'agent-1',
			code: 'slack-code',
			state: state ?? '',
		});

		const tokenInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
		expect(fetchMock.mock.calls[1]?.[0]).toBe('https://slack.com/api/oauth.v2.access');
		expect(tokenInit.headers).toEqual(
			expect.objectContaining({
				Authorization: `Basic ${Buffer.from('C123:client-secret').toString('base64')}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			}),
		);
		const tokenParams = fetchParams(fetchMock, 1);
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
			'user-1',
			'project-1',
		);
		expect(agentsService.saveCredentialIntegration).toHaveBeenCalledWith(agent, integration);
		expect(cacheService.delete).toHaveBeenCalledWith(`agents:slack-app-setup:${state}`);
		expect(cipher.decryptV2).toHaveBeenCalledWith(encryptedSession);
	});

	it('rejects a callback state that does not belong to the requested project and agent', async () => {
		fetchMock.mockResolvedValueOnce(
			slackResponse({
				ok: true,
				app_id: 'A123',
				credentials: {
					client_id: 'C123',
					client_secret: 'client-secret',
					signing_secret: 'signing-secret',
				},
				oauth_authorize_url: 'https://slack.com/oauth/v2/authorize?client_id=C123',
			}),
		);

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
		expect(credentialsService.createUnmanagedCredential).not.toHaveBeenCalled();
		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});
});

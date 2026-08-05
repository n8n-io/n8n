import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import { AgentIntegrationsController } from '../agent-integrations.controller';
import type { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { SlackAppSetupService } from '../integrations/slack-app-setup.service';
import type { AgentRepository } from '../repositories/agent.repository';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

const UNAUTHENTICATED_HANDLERS = new Set(['handleWebhook', 'handleSlackAppOAuthCallback']);

function makeController({
	agentIntegrationPersistenceService = mock<AgentIntegrationPersistenceService>(),
	credentialsService = mock<CredentialsService>(),
	chatIntegrationService = mock<ChatIntegrationService>(),
	agentRepository = mock<AgentRepository>(),
	chatIntegrationRegistry = mock<ChatIntegrationRegistry>(),
	slackAppSetupService = mock<SlackAppSetupService>(),
}: {
	agentIntegrationPersistenceService?: Mocked<AgentIntegrationPersistenceService>;
	credentialsService?: Mocked<CredentialsService>;
	chatIntegrationService?: Mocked<ChatIntegrationService>;
	agentRepository?: Mocked<AgentRepository>;
	chatIntegrationRegistry?: Mocked<ChatIntegrationRegistry>;
	slackAppSetupService?: Mocked<SlackAppSetupService>;
} = {}) {
	if (!chatIntegrationRegistry.require.getMockImplementation()) {
		chatIntegrationRegistry.require.mockImplementation(
			(type: string) =>
				({
					type,
					displayLabel: type,
					credentialTypes:
						type === 'telegram'
							? ['telegramApi']
							: type === 'linear'
								? ['linearOAuth2Api']
								: [`${type}Api`],
				}) as never,
		);
	}

	return {
		controller: new AgentIntegrationsController(
			agentIntegrationPersistenceService,
			credentialsService,
			chatIntegrationService,
			agentRepository,
			chatIntegrationRegistry,
			slackAppSetupService,
		),
		agentIntegrationPersistenceService,
		credentialsService,
		chatIntegrationService,
		agentRepository,
		chatIntegrationRegistry,
		slackAppSetupService,
	};
}

describe('AgentIntegrationsController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentIntegrationsController, UNAUTHENTICATED_HANDLERS);

	const routes = getRoutesByHandlerName(AgentIntegrationsController);

	it.each([
		['connectIntegration', 'agent:update'],
		['createSlackApp', 'agent:update'],
		['getSlackAppManifest', 'agent:read'],
		['disconnectIntegration', 'agent:update'],
		['integrationStatus', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentIntegrationsController integration credentials', () => {
	it('rejects credentials that are not usable in the agent project', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-allowed',
				name: 'Allowed Slack',
				type: 'slackApi',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			activeVersion: {},
			integrations: [],
		} as never);

		const { controller } = makeController({
			credentialsService,
			chatIntegrationService,
			agentRepository,
		});

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: 'cred-outside-project' },
				} as never,
				undefined as never,
				'agent-1',
			),
		).rejects.toThrow(NotFoundError);

		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(
			{ id: 'user-1' },
			{ projectId: 'project-1' },
		);
		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});

	it('requires Telegram settings when connecting Telegram', async () => {
		const { controller, chatIntegrationService } = makeController();

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'telegram', credentialId: 'cred-telegram' },
				} as never,
				undefined as never,
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);

		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});

	it('rejects credentials whose type is not supported by the chat integration', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-oauth',
				name: 'Slack OAuth',
				type: 'slackOAuth2Api',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			activeVersion: {},
			integrations: [],
		} as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
		chatIntegrationRegistry.require.mockReturnValue({
			type: 'slack',
			credentialTypes: ['slackApi'],
		} as never);

		const { controller } = makeController({
			credentialsService,
			chatIntegrationService,
			agentRepository,
			chatIntegrationRegistry,
		});

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: 'cred-oauth' },
				} as never,
				undefined as never,
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);

		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
	});

	it('persists, connects, and broadcasts Telegram settings for a published agent', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-telegram',
				name: 'Telegram Bot',
				type: 'telegramApi',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			activeVersion: {},
			integrations: [],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const agentIntegrationPersistenceService = mock<AgentIntegrationPersistenceService>();
		agentIntegrationPersistenceService.saveCredentialIntegration.mockResolvedValue(agent as never);
		const { controller } = makeController({
			agentIntegrationPersistenceService,
			credentialsService,
			chatIntegrationService,
			agentRepository,
		});
		const settings = {
			accessMode: 'private' as const,
			allowedUsers: ['123'],
		};

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: {
						type: 'telegram',
						credentialId: 'cred-telegram',
						settings,
					},
				} as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({ status: 'connected' });

		const integration = {
			type: 'telegram',
			credentialId: 'cred-telegram',
			settings,
		};
		expect(agentIntegrationPersistenceService.saveCredentialIntegration).toHaveBeenCalledWith(
			agent,
			integration,
			{
				user: { id: 'user-1' },
				modifiedBy: 'user',
				broadcast: false,
			},
		);
		expect(chatIntegrationService.connect).toHaveBeenCalledWith(
			'agent-1',
			integration,
			'project-1',
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
	});

	it.each([
		{ type: 'slack', credentialId: 'cred-slack', credentialType: 'slackApi' },
		{ type: 'linear', credentialId: 'cred-linear', credentialType: 'linearOAuth2Api' },
	])('persists $type without connecting or publishing an unpublished agent', async (testCase) => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: testCase.credentialId,
				name: 'Channel credential',
				type: testCase.credentialType,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: null,
			activeVersion: null,
			integrations: [],
		};
		const savedAgent = {
			...agent,
			integrations: [{ type: testCase.type, credentialId: testCase.credentialId }],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const agentIntegrationPersistenceService = mock<AgentIntegrationPersistenceService>();
		agentIntegrationPersistenceService.saveCredentialIntegration.mockResolvedValue(
			savedAgent as never,
		);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.connect.mockResolvedValue(undefined);
		chatIntegrationService.broadcastIntegrationChange.mockResolvedValue(undefined);
		const { controller } = makeController({
			agentIntegrationPersistenceService,
			credentialsService,
			chatIntegrationService,
			agentRepository,
		});

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: testCase.type, credentialId: testCase.credentialId },
				} as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({ status: 'configured' });

		const integration = { type: testCase.type, credentialId: testCase.credentialId };
		expect(agentIntegrationPersistenceService.saveCredentialIntegration).toHaveBeenCalledWith(
			agent,
			integration,
			{
				user: { id: 'user-1' },
				modifiedBy: 'user',
				broadcast: false,
			},
		);
		expect(chatIntegrationService.connect).not.toHaveBeenCalled();
		expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('does not broadcast when connecting a published agent fails', async () => {
		const credentialsService = mock<CredentialsService>();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{
				id: 'cred-slack',
				name: 'Slack Bot',
				type: 'slackApi',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				scopes: [],
				isManaged: false,
				isGlobal: false,
				isResolvable: true,
				currentUserHasAccess: true,
				homeProject: null,
				sharedWithProjects: [],
			},
		]);

		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			activeVersion: {},
			integrations: [],
		};
		const savedAgent = {
			...agent,
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const agentIntegrationPersistenceService = mock<AgentIntegrationPersistenceService>();
		agentIntegrationPersistenceService.saveCredentialIntegration.mockResolvedValue(
			savedAgent as never,
		);
		const chatIntegrationService = mock<ChatIntegrationService>();
		chatIntegrationService.connect.mockRejectedValue(new Error('Slack connect failed'));
		const { controller } = makeController({
			agentIntegrationPersistenceService,
			credentialsService,
			chatIntegrationService,
			agentRepository,
		});

		await expect(
			controller.connectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: 'cred-slack' },
				} as never,
				undefined as never,
				'agent-1',
			),
		).rejects.toThrow('Slack connect failed');

		expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('reports complete persisted integrations as configured for an unpublished agent', async () => {
		const settings = {
			accessMode: 'private' as const,
			allowedUsers: ['123'],
		};
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: null,
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					settings,
				},
			],
		} as never);

		const { controller } = makeController({ agentRepository });

		await expect(
			controller.integrationStatus(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({
			status: 'configured',
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					settings,
				},
			],
		});
	});

	it('reports complete persisted integrations as connected for a published agent', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			integrations: [{ type: 'linear', credentialId: 'cred-linear' }],
		} as never);

		const { controller } = makeController({ agentRepository });

		await expect(
			controller.integrationStatus(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({
			status: 'connected',
			integrations: [{ type: 'linear', credentialId: 'cred-linear' }],
		});
	});

	it('reports a draft integration (empty credentialId) as disconnected', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'v1',
			integrations: [{ type: 'slack', credentialId: '' }],
		} as never);

		const { controller } = makeController({ agentRepository });

		await expect(
			controller.integrationStatus(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({ status: 'disconnected', integrations: [] });
	});

	it('disconnects the channel before removing the persisted integration', async () => {
		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const agentIntegrationPersistenceService = mock<AgentIntegrationPersistenceService>();
		const { controller } = makeController({
			agentRepository,
			chatIntegrationService,
			agentIntegrationPersistenceService,
		});

		await expect(
			controller.disconnectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: 'cred-slack' },
				} as never,
				undefined as never,
				'agent-1',
				{ type: 'slack', credentialId: 'cred-slack' },
			),
		).resolves.toEqual({ status: 'disconnected' });

		expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith('agent-1', {
			type: 'slack',
			credentialId: 'cred-slack',
		});
		expect(agentIntegrationPersistenceService.removeCredentialIntegration).toHaveBeenCalledWith(
			agent,
			'slack',
			'cred-slack',
			{ user: { id: 'user-1' }, modifiedBy: 'user', broadcast: false },
		);
		expect(chatIntegrationService.disconnectChannel.mock.invocationCallOrder[0]).toBeLessThan(
			agentIntegrationPersistenceService.removeCredentialIntegration.mock.invocationCallOrder[0],
		);
	});

	it('disconnects a draft integration entry with an empty credentialId', async () => {
		const agentRepository = mock<AgentRepository>();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			integrations: [{ type: 'slack', credentialId: '' }],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent as never);

		const chatIntegrationService = mock<ChatIntegrationService>();
		const agentIntegrationPersistenceService = mock<AgentIntegrationPersistenceService>();
		const { controller } = makeController({
			agentRepository,
			chatIntegrationService,
			agentIntegrationPersistenceService,
		});

		await expect(
			controller.disconnectIntegration(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					body: { type: 'slack', credentialId: '' },
				} as never,
				undefined as never,
				'agent-1',
				{ type: 'slack', credentialId: '' },
			),
		).resolves.toEqual({ status: 'disconnected' });

		expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith('agent-1', {
			type: 'slack',
			credentialId: '',
		});
		expect(agentIntegrationPersistenceService.removeCredentialIntegration).toHaveBeenCalledWith(
			agent,
			'slack',
			'',
			{ user: { id: 'user-1' }, modifiedBy: 'user', broadcast: false },
		);
	});

	it('starts Slack app setup with the temporary app configuration token', async () => {
		const slackAppSetupService = mock<SlackAppSetupService>();
		slackAppSetupService.createApp.mockResolvedValue({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});
		const { controller } = makeController({ slackAppSetupService });

		await expect(
			controller.createSlackApp(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
				} as never,
				undefined as never,
				'agent-1',
				{ appConfigurationToken: 'xoxe-config' },
			),
		).resolves.toEqual({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});

		expect(slackAppSetupService.createApp).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
			appConfigurationToken: 'xoxe-config',
			user: { id: 'user-1' },
		});
	});

	it('returns the manual Slack app manifest', async () => {
		const slackAppSetupService = mock<SlackAppSetupService>();
		slackAppSetupService.getManualManifest.mockResolvedValue({
			manifest: {
				display_information: { name: 'Support Agent' },
				features: {
					app_home: {
						home_tab_enabled: true,
						messages_tab_enabled: true,
						messages_tab_read_only_enabled: false,
					},
					bot_user: {
						display_name: 'Support Agent',
						always_online: true,
					},
				},
				oauth_config: {
					scopes: { bot: ['chat:write'] },
				},
				settings: {
					event_subscriptions: {
						request_url:
							'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
						bot_events: ['app_mention'],
					},
					interactivity: {
						is_enabled: true,
						request_url:
							'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
					},
					org_deploy_enabled: false,
					socket_mode_enabled: false,
					token_rotation_enabled: false,
				},
			},
		});
		const { controller } = makeController({ slackAppSetupService });

		await expect(
			controller.getSlackAppManifest(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'agent-1',
			),
		).resolves.toEqual({
			manifest: expect.objectContaining({
				display_information: { name: 'Support Agent' },
				oauth_config: {
					scopes: { bot: ['chat:write'] },
				},
			}),
		});

		expect(slackAppSetupService.getManualManifest).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
		});
	});

	it('completes Slack app setup from the OAuth callback and renders the success template', async () => {
		const slackAppSetupService = mock<SlackAppSetupService>();
		const { controller } = makeController({ slackAppSetupService });
		const res = { render: vi.fn() };

		await controller.handleSlackAppOAuthCallback(
			{
				params: { projectId: 'project-1' },
				query: { code: 'slack-code', state: 'setup-state' },
			} as never,
			res as never,
			'agent-1',
		);

		expect(slackAppSetupService.completeInstall).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: 'agent-1',
			code: 'slack-code',
			state: 'setup-state',
		});
		expect(res.render).toHaveBeenCalledWith('oauth-callback');
	});

	it('renders the Slack OAuth error callback when Slack denies setup', async () => {
		const slackAppSetupService = mock<SlackAppSetupService>();
		const { controller } = makeController({ slackAppSetupService });
		const res = { render: vi.fn() };

		await controller.handleSlackAppOAuthCallback(
			{
				params: { projectId: 'project-1' },
				query: { error: 'access_denied', error_description: 'User denied install' },
			} as never,
			res as never,
			'agent-1',
		);

		expect(slackAppSetupService.completeInstall).not.toHaveBeenCalled();
		expect(res.render).toHaveBeenCalledWith('oauth-error-callback', {
			error: {
				message: 'access_denied',
				reason: 'User denied install',
			},
		});
	});
});

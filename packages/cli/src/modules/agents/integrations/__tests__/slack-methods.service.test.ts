/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { CacheService } from '@/services/cache/cache.service';
import type { UrlService } from '@/services/url.service';

import type { AgentIntegrationManagementService } from '../../agent-integration-management.service';
import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import { SlackMethodsService } from '../platforms/slack/slack-methods.service';

describe('SlackMethodsService', () => {
	function makeService() {
		const credentialsService = mock<CredentialsService>();
		const managementService = mock<AgentIntegrationManagementService>();
		const agentRepository = mock<AgentRepository>();
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://hooks.example/');
		return {
			service: new SlackMethodsService(
				credentialsService,
				agentRepository,
				managementService,
				urlService,
				mock<OutboundHttp>(),
				mock<CacheService>(),
				mock<Cipher>(),
				mock<Logger>(),
			),
			credentialsService,
			managementService,
			agentRepository,
		};
	}

	const agent = {
		id: 'agent-1',
		projectId: 'project-1',
		name: 'Support Agent',
		activeVersionId: 'version-1',
	} as unknown as Agent;

	const session = {
		projectId: 'project-1',
		agentId: 'agent-1',
		userId: 'user-1',
		appId: 'app-1',
		clientId: 'client-1',
		clientSecret: 'client-secret',
		signingSecret: 'signing-secret',
		redirectUrl: 'https://n8n.example/callback',
	};

	it('creates a bot credential and delegates activation to integration management', async () => {
		const { service, credentialsService, managementService } = makeService();
		const user = { id: 'user-1' };
		credentialsService.createUnmanagedCredential.mockResolvedValue({
			id: 'credential-1',
		} as never);
		managementService.connect.mockResolvedValue({
			integration: {
				type: 'slack',
				credentialId: 'credential-1',
				settings: { messagingExperience: 'agent' },
			},
			savedAgent: agent,
		});
		await service.connectBotCredential(agent, user as never, 'xoxb-token', session);

		expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
			{
				name: 'Slack - Support Agent',
				type: 'slackApi',
				data: {
					accessToken: 'xoxb-token',
					signatureSecret: 'signing-secret',
				},
				projectId: 'project-1',
			},
			user,
		);
		expect(managementService.connect).toHaveBeenCalledWith({
			agent,
			user,
			integration: {
				type: 'slack',
				credentialId: 'credential-1',
				settings: { messagingExperience: 'agent' },
			},
		});
		expect(credentialsService.delete).not.toHaveBeenCalled();
	});

	describe('when the connect fails', () => {
		const user = { id: 'user-1' };

		function arrangeFailedConnect() {
			const context = makeService();
			context.credentialsService.createUnmanagedCredential.mockResolvedValue({
				id: 'credential-1',
			} as never);
			context.managementService.connect.mockRejectedValue(new Error('startup failed'));
			return context;
		}

		it('deletes the credential it created when nothing references it', async () => {
			const { service, credentialsService, agentRepository } = arrangeFailedConnect();
			agentRepository.findIntegrationState.mockResolvedValue({
				integrations: [],
				versionId: 'version-1',
				activeVersionId: 'version-1',
			} as never);

			await expect(
				service.connectBotCredential(agent, user as never, 'xoxb-token', session),
			).rejects.toThrow('startup failed');

			expect(credentialsService.delete).toHaveBeenCalledWith(user, 'credential-1');
		});

		it('keeps the credential when the agent durably references it', async () => {
			const { service, credentialsService, agentRepository } = arrangeFailedConnect();
			agentRepository.findIntegrationState.mockResolvedValue({
				integrations: [{ type: 'slack', credentialId: 'credential-1' }],
				versionId: 'version-1',
				activeVersionId: 'version-1',
			} as never);

			await expect(
				service.connectBotCredential(agent, user as never, 'xoxb-token', session),
			).rejects.toThrow('startup failed');

			expect(credentialsService.delete).not.toHaveBeenCalled();
		});

		it('reports the setup failure even when the cleanup itself fails', async () => {
			const { service, credentialsService, agentRepository } = arrangeFailedConnect();
			agentRepository.findIntegrationState.mockResolvedValue({
				integrations: [],
				versionId: 'version-1',
				activeVersionId: 'version-1',
			} as never);
			credentialsService.delete.mockRejectedValue(new Error('credential is in use'));

			await expect(
				service.connectBotCredential(agent, user as never, 'xoxb-token', session),
			).rejects.toThrow('startup failed');
		});
	});

	it('builds the manual manifest without OAuth redirect URLs', () => {
		const { service } = makeService();

		const manifest = service.buildManifest('Support Agent', 'project-1', 'agent-1');

		expect(manifest.display_information.name).toBe('Support Agent');
		expect(manifest.features.agent_view).toEqual({
			agent_description: 'Chat with Support Agent, an agent powered by n8n.',
		});
		expect(manifest.oauth_config).not.toHaveProperty('redirect_urls');
		expect(manifest.oauth_config.scopes.bot).toContain('chat:write');
		expect(manifest.settings.event_subscriptions.bot_events).toEqual(
			expect.arrayContaining(['app_context_changed', 'app_home_opened', 'message.im']),
		);
		expect(manifest.settings.event_subscriptions.bot_events).not.toEqual(
			expect.arrayContaining(['assistant_thread_started', 'assistant_thread_context_changed']),
		);
		expect(manifest.settings.event_subscriptions.request_url).toBe(
			'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
		);
		expect(manifest.settings.interactivity).toEqual({
			is_enabled: true,
			request_url: 'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
		});
	});

	it('adds callback state and redirect URL to the Slack install URL', () => {
		const { service } = makeService();

		const result = new URL(
			service.installUrl(
				'https://slack.com/oauth/v2/authorize?client_id=client-1',
				'state-1',
				'https://n8n.example/callback',
			),
		);

		expect(result.searchParams.get('client_id')).toBe('client-1');
		expect(result.searchParams.get('state')).toBe('state-1');
		expect(result.searchParams.get('redirect_uri')).toBe('https://n8n.example/callback');
	});
});

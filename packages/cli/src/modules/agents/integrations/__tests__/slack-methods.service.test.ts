/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { UrlService } from '@/services/url.service';

import type { AgentIntegrationManagementService } from '../../agent-integration-management.service';
import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import { SlackMethodsService } from '../platforms/slack/slack-methods.service';

describe('SlackMethodsService', () => {
	function makeService() {
		const credentialsService = mock<CredentialsService>();
		const managementService = mock<AgentIntegrationManagementService>();
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://hooks.example/');
		return {
			service: new SlackMethodsService(
				credentialsService,
				mock<AgentRepository>(),
				managementService,
				urlService,
				mock<OutboundHttp>(),
			),
			credentialsService,
			managementService,
		};
	}

	it('creates a bot credential and delegates published activation to integration management', async () => {
		const { service, credentialsService, managementService } = makeService();
		const agent = {
			id: 'agent-1',
			projectId: 'project-1',
			name: 'Support Agent',
			activeVersionId: 'version-1',
		} as unknown as Agent;
		const user = { id: 'user-1' };
		credentialsService.createUnmanagedCredential.mockResolvedValue({
			id: 'credential-1',
		} as never);
		managementService.connect.mockResolvedValue({
			integration: { type: 'slack', credentialId: 'credential-1' },
			savedAgent: agent,
		});
		await service.createAndConnectBotCredential({
			agent,
			user: user as never,
			accessToken: 'xoxb-token',
			signingSecret: 'signing-secret',
		});

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
			integration: { type: 'slack', credentialId: 'credential-1' },
		});
	});

	it('builds the manual manifest without OAuth redirect URLs', () => {
		const { service } = makeService();

		const manifest = service.buildManifest('Support Agent', 'project-1', 'agent-1');

		expect(manifest.display_information.name).toBe('Support Agent');
		expect(manifest.oauth_config).not.toHaveProperty('redirect_urls');
		expect(manifest.oauth_config.scopes.bot).toContain('chat:write');
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

import type { User } from '@n8n/db';
import type { CredentialsFinderService } from '@n8n/backend-services';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { CredentialsEntity } from '@n8n/db';
import type { CredentialsService } from '@/credentials/credentials.service';

import type { ChatIntegrationService } from '../../integrations/chat-integration.service';
import type { SlackMethodsService } from '../../integrations/platforms/slack/slack-methods.service';
import type { AgentRepository } from '../../repositories/agent.repository';
import { SystemAgentChannelService } from '../system-agent-channel.service';
import { SystemAgentRegistry } from '../system-agent-registry';
import type { SystemAgentProvider } from '../system-agent.types';

const AGENT_ID = 'test-system-agent';
const user = mock<User>({ id: 'admin-1' });

function setup(authorizeChannelSetup?: SystemAgentProvider['authorizeChannelSetup']) {
	const registry = new SystemAgentRegistry();
	registry.register({
		agentId: AGENT_ID,
		name: 'Test Agent',
		authorize: async () => true,
		prepareTurn: vi.fn(),
		...(authorizeChannelSetup ? { authorizeChannelSetup } : {}),
	});
	const agentRepository = mock<AgentRepository>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	chatIntegrationService.buildInstanceWebhookUrl.mockReturnValue('https://n8n.test/hook');
	const credentialsFinderService = mock<CredentialsFinderService>();
	const credentialsService = mock<CredentialsService>();
	const slackMethods = mock<SlackMethodsService>();
	const service = new SystemAgentChannelService(
		registry,
		agentRepository,
		chatIntegrationService,
		credentialsFinderService,
		credentialsService,
		slackMethods,
	);
	return {
		service,
		agentRepository,
		chatIntegrationService,
		credentialsFinderService,
		credentialsService,
		slackMethods,
	};
}

describe('SystemAgentChannelService', () => {
	describe('access', () => {
		it('denies setup when the provider has no setup hook', async () => {
			const { service } = setup();
			await expect(service.getManifest(AGENT_ID, user)).rejects.toThrow(ForbiddenError);
		});

		it('denies setup when the provider says no', async () => {
			const { service, chatIntegrationService } = setup(() => false);
			await expect(service.connectSlack(AGENT_ID, user, 'cred-1')).rejects.toThrow(ForbiddenError);
			await expect(service.disconnectSlack(AGENT_ID, user)).rejects.toThrow(ForbiddenError);
			expect(chatIntegrationService.connectInstanceChannel).not.toHaveBeenCalled();
			expect(chatIntegrationService.disconnectInstanceChannel).not.toHaveBeenCalled();
		});

		it('reports an unknown agent as not found', async () => {
			const { service } = setup(() => true);
			await expect(service.getManifest('unknown', user)).rejects.toThrow(NotFoundError);
		});
	});

	describe('getManifest', () => {
		it('builds the manifest with the instance webhook URL and the agent name', async () => {
			const { service, slackMethods } = setup(() => true);
			const manifest = { display_information: { name: 'Test Agent' } };
			slackMethods.buildInstanceManifest.mockReturnValue(manifest as never);

			await expect(service.getManifest(AGENT_ID, user)).resolves.toEqual({ manifest });
			expect(slackMethods.buildInstanceManifest).toHaveBeenCalledWith(
				'Test Agent',
				'https://n8n.test/hook',
			);
		});
	});

	describe('connectSlack', () => {
		function withCredential(ctx: ReturnType<typeof setup>, type = 'slackApi') {
			ctx.credentialsFinderService.findCredentialForUser.mockResolvedValue({
				id: 'cred-1',
				type,
			} as CredentialsEntity);
			ctx.credentialsService.decryptForUse.mockResolvedValue({ accessToken: 'xoxb-fake' });
		}

		it('keeps the workspace and the bot user that Slack reports', async () => {
			const ctx = setup(() => true);
			withCredential(ctx);
			ctx.slackMethods.callSlackApi.mockResolvedValue({
				ok: true,
				team_id: 'T1',
				user_id: 'UBOT',
			} as never);
			ctx.agentRepository.findInstanceAgentIntegrations.mockResolvedValue([]);

			await ctx.service.connectSlack(AGENT_ID, user, 'cred-1');

			expect(ctx.credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				'cred-1',
				user,
				['credential:read'],
				{ excludeSeeOnlyRoles: true },
			);
			expect(ctx.slackMethods.callSlackApi).toHaveBeenCalledWith(
				'auth.test',
				{},
				{ authorization: 'Bearer xoxb-fake' },
			);
			expect(ctx.chatIntegrationService.connectInstanceChannel).toHaveBeenCalledWith(AGENT_ID, {
				type: 'slack',
				credentialId: 'cred-1',
				settings: {
					messagingExperience: 'assistant',
					onlyRespondWhenMentioned: true,
					teamId: 'T1',
					botUserId: 'UBOT',
					identity: 'email',
				},
			});
		});

		it('refuses a credential that the user cannot read', async () => {
			const ctx = setup(() => true);
			ctx.credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(ctx.service.connectSlack(AGENT_ID, user, 'cred-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(ctx.chatIntegrationService.connectInstanceChannel).not.toHaveBeenCalled();
		});

		it('refuses a credential of another type', async () => {
			const ctx = setup(() => true);
			withCredential(ctx, 'githubApi');

			await expect(ctx.service.connectSlack(AGENT_ID, user, 'cred-1')).rejects.toThrow(
				NotFoundError,
			);
		});

		it('does not connect when Slack rejects the token', async () => {
			const ctx = setup(() => true);
			withCredential(ctx);
			ctx.slackMethods.callSlackApi.mockResolvedValue({ ok: false, error: 'invalid_auth' });
			ctx.slackMethods.slackError.mockReturnValue(new BadRequestError('Slack could not check'));

			await expect(ctx.service.connectSlack(AGENT_ID, user, 'cred-1')).rejects.toThrow(
				BadRequestError,
			);
			expect(ctx.chatIntegrationService.connectInstanceChannel).not.toHaveBeenCalled();
		});
	});

	describe('getSlackConnection', () => {
		it('reports no connection when the agent has no Slack channel', async () => {
			const ctx = setup(() => true);
			ctx.agentRepository.findInstanceAgentIntegrations.mockResolvedValue([]);

			await expect(ctx.service.getSlackConnection(AGENT_ID, user)).resolves.toEqual({
				connected: false,
				webhookUrl: 'https://n8n.test/hook',
			});
		});

		it('reports the connection and whether this main runs it', async () => {
			const ctx = setup(() => true);
			ctx.agentRepository.findInstanceAgentIntegrations.mockResolvedValue([
				{
					type: 'slack',
					credentialId: 'cred-1',
					settings: { messagingExperience: 'assistant', teamId: 'T1', botUserId: 'UBOT' },
				},
			]);
			ctx.chatIntegrationService.hasLiveChannel.mockReturnValue(true);

			await expect(ctx.service.getSlackConnection(AGENT_ID, user)).resolves.toEqual({
				connected: true,
				webhookUrl: 'https://n8n.test/hook',
				credentialId: 'cred-1',
				teamId: 'T1',
				botUserId: 'UBOT',
				running: true,
			});
		});
	});

	describe('disconnectSlack', () => {
		it('removes the Slack channel from the agent', async () => {
			const ctx = setup(() => true);

			await ctx.service.disconnectSlack(AGENT_ID, user);

			expect(ctx.chatIntegrationService.disconnectInstanceChannel).toHaveBeenCalledWith(
				AGENT_ID,
				'slack',
			);
		});
	});
});

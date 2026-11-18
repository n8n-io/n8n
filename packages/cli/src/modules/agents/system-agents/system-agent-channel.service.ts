import type {
	AgentIntegrationConfig,
	SlackAgentAppManifestResponse,
	SystemAgentSlackConnectionResponse,
} from '@n8n/api-types';
import { CredentialsFinderService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';

import { CredentialsService } from '@/credentials/credentials.service';

import { ChatIntegrationService } from '../integrations/chat-integration.service';
import { SlackMethodsService } from '../integrations/platforms/slack/slack-methods.service';
import { SLACK_CREDENTIAL_TYPE } from '../integrations/platforms/slack/slack-setup.types';
import { AgentRepository } from '../repositories/agent.repository';
import { agentChannelRef } from '../utils/agent-channel';
import { SystemAgentRegistry } from './system-agent-registry';
import type { SystemAgentProvider } from './system-agent.types';

const SLACK = 'slack';

/**
 * Sets up the instance-level Slack connection of a system agent. One Slack app
 * serves the whole instance. The provider decides who may set it up, so the
 * runtime holds no rule about a specific agent.
 */
@Service()
export class SystemAgentChannelService {
	constructor(
		private readonly registry: SystemAgentRegistry,
		private readonly agentRepository: AgentRepository,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly slackMethods: SlackMethodsService,
	) {}

	/** Only a user that the provider allows can set up a channel. Without the hook, nobody can. */
	async assertCanSetUp(agentId: string, user: User): Promise<SystemAgentProvider> {
		const provider = this.registry.get(agentId);
		if (!provider) throw new NotFoundError(`Agent "${agentId}" not found`);
		if (!(await provider.authorizeChannelSetup?.(user))) {
			throw new ForbiddenError('You cannot set up channels for this agent');
		}
		return provider;
	}

	async getManifest(agentId: string, user: User): Promise<SlackAgentAppManifestResponse> {
		const provider = await this.assertCanSetUp(agentId, user);
		return {
			manifest: this.slackMethods.buildInstanceManifest(
				provider.name,
				this.chatIntegrationService.buildInstanceWebhookUrl(agentId, SLACK),
			),
		};
	}

	async getSlackConnection(
		agentId: string,
		user: User,
	): Promise<SystemAgentSlackConnectionResponse> {
		await this.assertCanSetUp(agentId, user);
		const webhookUrl = this.chatIntegrationService.buildInstanceWebhookUrl(agentId, SLACK);
		const integrations = (await this.agentRepository.findInstanceAgentIntegrations(agentId)) ?? [];
		const slack = integrations.find((entry) => entry.type === SLACK);
		if (slack?.type !== SLACK) return { connected: false, webhookUrl };
		return {
			connected: true,
			webhookUrl,
			credentialId: slack.credentialId,
			...(slack.settings?.teamId ? { teamId: slack.settings.teamId } : {}),
			...(slack.settings?.botUserId ? { botUserId: slack.settings.botUserId } : {}),
			running: this.chatIntegrationService.hasLiveChannel(
				agentChannelRef(agentId, { type: SLACK, credentialId: slack.credentialId }),
			),
		};
	}

	/**
	 * Connect the agent to Slack with a credential that the user can read. It asks
	 * Slack which workspace and bot the token belongs to, and keeps both. The
	 * runtime later drops events from any other workspace.
	 */
	async connectSlack(
		agentId: string,
		user: User,
		credentialId: string,
	): Promise<SystemAgentSlackConnectionResponse> {
		await this.assertCanSetUp(agentId, user);

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
			{ excludeSeeOnlyRoles: true },
		);
		if (credential?.type !== SLACK_CREDENTIAL_TYPE) {
			throw new NotFoundError(`Credential "${credentialId}" not found`);
		}
		const data = await this.credentialsService.decryptForUse(credential, { kind: 'user', user });
		const token = typeof data.accessToken === 'string' ? data.accessToken : '';
		if (!token) throw new BadRequestError('The Slack credential has no bot token');

		const identity = await this.slackMethods.callSlackApi<{ team_id?: string; user_id?: string }>(
			'auth.test',
			{},
			{ authorization: `Bearer ${token}` },
		);
		if (!identity.ok) throw this.slackMethods.slackError('check the bot token', identity);
		if (!identity.team_id || !identity.user_id) {
			throw new BadRequestError('Slack did not return the workspace of the bot token');
		}

		const integration: AgentIntegrationConfig = {
			type: SLACK,
			credentialId,
			settings: {
				// The manifest enables Slack's agent view. Without this setting, a direct
				// message has no thread, so Slack shows no "Thinking..." status.
				messagingExperience: 'agent',
				// Not set: the bot also reads the replies of a thread that it joined. The bridge
				// answers a reply without a mention only to the person who owns the thread.
				teamId: identity.team_id,
				botUserId: identity.user_id,
				identity: 'email',
			},
		};
		await this.chatIntegrationService.connectInstanceChannel(agentId, integration);
		return await this.getSlackConnection(agentId, user);
	}

	async disconnectSlack(agentId: string, user: User): Promise<void> {
		await this.assertCanSetUp(agentId, user);
		await this.chatIntegrationService.disconnectInstanceChannel(agentId, SLACK);
	}
}

import { isSlackManagerCredentialReady } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { SlackManagedSetupService } from '@/modules/agents/integrations/platforms/slack/slack-managed-setup.service';
import { SlackManualSetupService } from '@/modules/agents/integrations/platforms/slack/slack-manual-setup.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';

export const SLACK_INTEGRATION_TYPE = 'slack';

const CONNECT_WORKSPACE_STEP =
	'Ask the user to open the Agent in n8n, choose Add channel, pick Slack, and connect their Slack workspace once. Then call update_agent_integration again without credentialId.';

const RECONNECT_WORKSPACE_STEP =
	'Ask the user to open the Agent in n8n, choose Add channel, pick Slack, and reconnect the listed Slack workspace credential. Then call update_agent_integration again without credentialId.';

const UNVERIFIED_APP_WARNING =
	'n8n could not confirm that it built the Slack app behind this credential for this Agent, so the Agent may receive no events. This happens for an app made for another use, such as a Slack Trigger, or for an app that n8n built for another Agent. Make sure the app sends Event Subscriptions and Interactivity to slackApp.requestUrl, with Socket Mode off and the bot events in slackApp.manifest. To let n8n build a correct app, disconnect this credential and call update_agent_integration without credentialId.';

/**
 * Slack setup steps for MCP clients.
 *
 * A Slack app sends events only to the request URL in its own configuration.
 * n8n sets that URL itself when it builds the app for an Agent. A bot
 * credential from any other Slack app, such as one made for a Slack Trigger
 * or for another Agent, passes every credential check but sends its events
 * elsewhere.
 */
@Service()
export class McpAgentSlackSetup {
	constructor(
		private readonly managedSetup: SlackManagedSetupService,
		private readonly manualSetup: SlackManualSetupService,
		private readonly logger: Logger,
	) {}

	/**
	 * Report the next managed setup step without changing anything, so the
	 * client must come back with an explicit workspace before n8n creates a
	 * Slack app.
	 */
	async describeSetup(agent: Agent, user: User, agentUrl: string) {
		const state = await this.managedSetup.getSetupState({
			projectId: agent.projectId,
			agentId: agent.id,
			user,
		});
		if (!state.managedSetupAvailable) {
			return {
				ok: false,
				code: 'slack_managed_setup_unavailable',
				agentId: agent.id,
				configured: false,
				error:
					'This n8n instance cannot create Slack apps automatically. Connect Slack with a bot credential from a Slack app that sends its events to this Agent.',
				agentUrl,
				slackApp: await this.appRequirements(agent),
				nextStep:
					"Ask the user to create a Slack app from slackApp.manifest, or to set its Event Subscriptions and Interactivity request URLs to slackApp.requestUrl with Socket Mode off. Then call update_agent_integration with a slackApi credential that holds that app's Bot User OAuth Token and Signing Secret. The user can also do all of this from agentUrl with Add channel.",
			};
		}

		const managerCredentials = state.managerCredentials
			.filter((manager) => isSlackManagerCredentialReady(manager) && manager.workspaces.length > 0)
			.map((manager) => ({
				managerCredentialId: manager.id,
				name: manager.name,
				workspaces: manager.workspaces.map((workspace) => ({
					workspaceId: workspace.id,
					name: workspace.name,
					connected: workspace.connected,
					...(workspace.botCredentialId ? { credentialId: workspace.botCredentialId } : {}),
				})),
			}));
		if (managerCredentials.length === 0 && state.managerCredentials.length > 0) {
			return {
				ok: false,
				code: 'slack_manager_reconnect_required',
				agentId: agent.id,
				configured: false,
				error: 'The Slack workspace credentials in this project must be reconnected.',
				managerCredentials: state.managerCredentials.map((manager) => ({
					managerCredentialId: manager.id,
					name: manager.name,
				})),
				agentUrl,
				nextStep: RECONNECT_WORKSPACE_STEP,
			};
		}
		if (managerCredentials.length === 0) {
			return {
				ok: false,
				code: 'slack_workspace_not_connected',
				agentId: agent.id,
				configured: false,
				error: 'No connected Slack workspace is available to this project.',
				agentUrl,
				nextStep: CONNECT_WORKSPACE_STEP,
			};
		}

		return {
			ok: true,
			status: 'workspace_selection_required',
			agentId: agent.id,
			configured: false,
			managerCredentials,
			nextStep:
				'Ask the user which workspace to install the Agent in and confirm that n8n may create a Slack app there. Then call update_agent_integration again with that managerCredentialId and workspaceId. A workspace with connected=true already has this Agent.',
		};
	}

	async install(
		agent: Agent,
		user: User,
		target: { managerCredentialId: string; workspaceId: string },
	) {
		return await this.managedSetup.installApp({
			projectId: agent.projectId,
			agentId: agent.id,
			user,
			managerCredentialId: target.managerCredentialId,
			workspaceId: target.workspaceId,
			modifiedBy: 'mcp',
		});
	}

	/**
	 * n8n cannot read a Slack app's request URL with a bot token, so for a
	 * credential that n8n did not build for this Agent, return what the app must
	 * be set to.
	 */
	async describeBotCredential(agent: Agent, user: User, credentialId: string) {
		if (await this.isAppConfiguredForAgent(agent, user, credentialId)) {
			return { slackApp: { configuredForAgent: true } };
		}
		return {
			slackApp: { configuredForAgent: false, ...(await this.appRequirements(agent)) },
			warning: UNVERIFIED_APP_WARNING,
		};
	}

	/**
	 * A failed check counts as unverified: the caller has already saved the
	 * connect, or can only report the result.
	 */
	async isAppConfiguredForAgent(agent: Agent, user: User, credentialId: string) {
		try {
			return await this.managedSetup.isAppConfiguredForAgent(credentialId, agent, user);
		} catch (error) {
			this.logger.warn('[McpAgentSlackSetup] Could not check the Slack app of a credential', {
				agentId: agent.id,
				credentialId,
				error,
			});
			return false;
		}
	}

	private async appRequirements(agent: Agent) {
		const { manifest } = await this.manualSetup.getManifest({
			projectId: agent.projectId,
			agentId: agent.id,
		});
		return { requestUrl: manifest.settings.event_subscriptions.request_url, manifest };
	}
}

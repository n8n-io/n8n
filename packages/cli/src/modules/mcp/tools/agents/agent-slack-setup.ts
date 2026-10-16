import { Service } from '@n8n/di';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { SlackManualSetupService } from '@/modules/agents/integrations/platforms/slack/slack-manual-setup.service';

export const SLACK_INTEGRATION_TYPE = 'slack';

@Service()
export class McpAgentSlackSetup {
	constructor(private readonly manualSetup: SlackManualSetupService) {}

	async describeSetup(agent: Agent) {
		const { manifest } = await this.manualSetup.getManifest({
			projectId: agent.projectId,
			agentId: agent.id,
		});
		return {
			slackApp: {
				configuredForAgent: false,
				requestUrl: manifest.settings.event_subscriptions.request_url,
				manifest,
			},
		};
	}
}

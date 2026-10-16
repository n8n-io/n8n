import type { AgentChannelSetupRequired, AgentIntegrationConfig } from '@n8n/api-types';
import { isCredentialAgentIntegration } from '@n8n/api-types';
import { UrlService } from '@n8n/backend-services';
import { Container, Service } from '@n8n/di';

import type { Agent } from './entities/agent.entity';
import type { IntegrationRef } from './utils/agent-channel';
import {
	isConfiguredIntegration,
	prepareChannelSetup,
	type AgentChannelState,
} from './utils/agent-channel-setup';

@Service()
export class AgentChannelSetupService {
	constructor(private readonly urlService: UrlService) {}

	async prepare(
		agent: AgentChannelState & Pick<Agent, 'id' | 'projectId'>,
		integrations: AgentIntegrationConfig[],
		options: { requested?: IntegrationRef; replaces?: IntegrationRef } = {},
	): Promise<Required<AgentChannelState>> {
		const reusable = integrations.filter(
			(integration) =>
				isCredentialAgentIntegration(integration) && isConfiguredIntegration(agent, integration),
		);
		const unverified: IntegrationRef[] = [];
		if (reusable.length > 0) {
			const { ChatIntegrationService } = await import('./integrations/chat-integration.service.js');
			for (const integration of reusable) {
				const configured = await Container.get(ChatIntegrationService).canReuseConnection(
					agent.id,
					integration,
					agent.projectId,
				);
				if (!configured) unverified.push(integration);
			}
		}
		return prepareChannelSetup(agent, integrations, { ...options, unverified });
	}

	getRequirements(
		agent: Pick<Agent, 'id' | 'projectId'> & Partial<Pick<Agent, 'pendingChannelSetup'>>,
	): AgentChannelSetupRequired[] {
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const agentUrl = `${baseUrl}/projects/${encodeURIComponent(agent.projectId)}/agents/${encodeURIComponent(agent.id)}`;
		return (agent.pendingChannelSetup?.requested ?? []).flatMap(
			({ integration, setupId }, index) => {
				if (!setupId) return [];
				return [
					{
						setupId,
						agentId: agent.id,
						projectId: agent.projectId,
						type: integration.type,
						credentialId: integration.credentialId,
						path: ['integrations', index],
						reason: 'destination-setup-required' as const,
						setupUrl: `${agentUrl}?channelSetup=${encodeURIComponent(setupId)}`,
					},
				];
			},
		);
	}
}

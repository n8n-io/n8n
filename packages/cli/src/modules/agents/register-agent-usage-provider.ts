import { Container } from '@n8n/di';

import { AgentUsageProviderProxy } from '@/modules/workflow-index/agent-usage-provider-proxy.service';

import { AgentCredentialDependencyRepository } from './repositories/agent-credential-dependency.repository';
import { AgentWorkflowDependencyRepository } from './repositories/agent-workflow-dependency.repository';
import { AgentRepository } from './repositories/agent.repository';

export function registerAgentUsageProvider(): void {
	const credentialDependencyRepository = Container.get(AgentCredentialDependencyRepository);
	const workflowDependencyRepository = Container.get(AgentWorkflowDependencyRepository);
	const agentRepository = Container.get(AgentRepository);

	Container.get(AgentUsageProviderProxy).registerProvider({
		async findAgentUsages(resourceType, resourceIds) {
			if (resourceType === 'credential') {
				const dependencies = await credentialDependencyRepository.findByCredentialIds(resourceIds);
				return dependencies.map(({ agentId, credentialId }) => ({
					agentId,
					resourceId: credentialId,
				}));
			}

			if (resourceType === 'workflow') {
				const dependencies = await workflowDependencyRepository.findByWorkflowIds(resourceIds);
				return dependencies.map(({ agentId, workflowId }) => ({
					agentId,
					resourceId: workflowId,
				}));
			}

			return [];
		},
		findAgentSummaries: async (agentIds) => await agentRepository.findSummariesByIds(agentIds),
	});
}

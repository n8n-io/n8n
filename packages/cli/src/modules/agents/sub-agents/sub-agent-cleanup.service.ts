import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentRepository } from '../repositories/agent.repository';
import { markAgentDraftDirty } from '../utils/agent-draft.utils';

@Service()
export class SubAgentCleanupService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
	) {}

	/**
	 * Remove a sub-agent reference from every parent agent's draft config.
	 * Called when the sub-agent is deleted or unpublished, so a parent never
	 * keeps delegating to (or silently reactivates delegation to) an agent
	 * that is no longer available as a sub-agent. Sub-agents are project-
	 * scoped, so only the child's own project needs scanning.
	 */
	async removeSubAgentFromParents(childAgentId: string, projectId: string): Promise<void> {
		const agents = await this.agentRepository.find({ where: { projectId } });

		for (const parent of agents) {
			if (parent.id === childAgentId) continue;

			const { schema } = parent;
			const configuredAgents = schema?.subAgents?.agents;
			if (!schema || !configuredAgents?.some((ref) => ref.agentId === childAgentId)) continue;

			parent.schema = {
				...schema,
				subAgents: {
					...schema.subAgents,
					agents: configuredAgents.filter((ref) => ref.agentId !== childAgentId),
				},
			};

			markAgentDraftDirty(parent);
			await this.agentRepository.save(parent);
			this.runtimeCacheService.clearRuntimes(parent.id);

			this.logger.debug('Removed sub-agent reference from parent agent', {
				childAgentId,
				parentId: parent.id,
			});
		}
	}
}

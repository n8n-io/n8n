import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { Agent } from '../entities/agent.entity';
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
			await this.removeSubAgentFromParent(parent, childAgentId);
		}
	}

	/**
	 * A fence loss means the parent changed concurrently, so the edit is
	 * re-applied to a fresh load instead of failing the caller's (unrelated)
	 * unpublish/delete request with a conflict.
	 */
	private async removeSubAgentFromParent(initial: Agent, childAgentId: string): Promise<void> {
		let parent: Agent | null = initial;

		for (let attempt = 0; attempt < 3 && parent; attempt++) {
			const { schema } = parent;
			const configuredAgents = schema?.subAgents?.agents;
			if (!schema || !configuredAgents?.some((ref) => ref.agentId === childAgentId)) return;

			parent.schema = {
				...schema,
				subAgents: {
					...schema.subAgents,
					agents: configuredAgents.filter((ref) => ref.agentId !== childAgentId),
				},
			};

			markAgentDraftDirty(parent);
			if (await this.agentRepository.saveDraftFenced(parent)) {
				this.runtimeCacheService.clearRuntimes(parent.id);

				this.logger.debug('Removed sub-agent reference from parent agent', {
					childAgentId,
					parentId: parent.id,
				});
				return;
			}

			parent = await this.agentRepository.findById(parent.id);
		}

		this.logger.warn('Could not remove sub-agent reference from parent agent', {
			childAgentId,
			parentId: initial.id,
		});
	}
}

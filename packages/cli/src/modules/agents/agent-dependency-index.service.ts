import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentCredentialDependencyRepository } from './repositories/agent-credential-dependency.repository';
import { AgentWorkflowDependencyRepository } from './repositories/agent-workflow-dependency.repository';
import { AgentRepository } from './repositories/agent.repository';

@Service()
export class AgentDependencyIndexService {
	private readonly batchSize: number;

	private readonly logger: Logger;

	constructor(
		private readonly credentialDependencyRepository: AgentCredentialDependencyRepository,
		private readonly workflowDependencyRepository: AgentWorkflowDependencyRepository,
		private readonly agentRepository: AgentRepository,
		private readonly runtimeCache: AgentRuntimeCacheService,
		logger: Logger,
		workflowsConfig: WorkflowsConfig,
	) {
		this.logger = logger.scoped('agents');
		this.batchSize = workflowsConfig.indexingBatchSize;
	}

	async remove(agentId: string): Promise<void> {
		await this.credentialDependencyRepository.removeForAgent(agentId);
		await this.workflowDependencyRepository.removeForAgent(agentId);
	}

	async refresh(agentId: string): Promise<void> {
		await this.credentialDependencyRepository.refreshForAgent(agentId);
		await this.workflowDependencyRepository.refreshForAgent(agentId);
	}

	/**
	 * Evict the cached runtimes of every agent that uses the workflow as a tool,
	 * so the next call rebuilds the tool from the workflow's current state.
	 */
	async invalidateRuntimesForWorkflow(workflowId: string): Promise<void> {
		const dependencies = await this.workflowDependencyRepository.findByWorkflowIds([workflowId]);
		for (const { agentId } of dependencies) this.runtimeCache.clearRuntimes(agentId);
	}

	async buildIndex(): Promise<void> {
		let afterId: string | null = null;

		while (true) {
			const agents = await this.agentRepository.findDependencyIndexAgentIdsBatch(
				afterId,
				this.batchSize,
			);

			for (const { id: agentId } of agents) {
				try {
					await this.refresh(agentId);
				} catch (error) {
					this.logger.error('Failed to index agent dependencies', { agentId, error });
				}
			}

			if (agents.length < this.batchSize) return;
			const lastAgent = agents[agents.length - 1];
			if (lastAgent === undefined) return;
			afterId = lastAgent.id;
		}
	}
}

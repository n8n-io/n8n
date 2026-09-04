import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AgentCredentialDependencyRepository } from './repositories/agent-credential-dependency.repository';
import { AgentRepository } from './repositories/agent.repository';

@Service()
export class AgentDependencyIndexService {
	private readonly batchSize: number;

	private readonly logger: Logger;

	constructor(
		private readonly dependencyRepository: AgentCredentialDependencyRepository,
		private readonly agentRepository: AgentRepository,
		logger: Logger,
		workflowsConfig: WorkflowsConfig,
	) {
		this.logger = logger.scoped('agents');
		this.batchSize = workflowsConfig.indexingBatchSize;
	}

	async remove(agentId: string): Promise<void> {
		await this.dependencyRepository.removeForAgent(agentId);
	}

	async refresh(agentId: string): Promise<void> {
		await this.dependencyRepository.refreshForAgent(agentId);
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

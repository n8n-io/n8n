import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';

import { ExecutionPersistence } from '@/executions/execution-persistence';

import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import { AgentHitlWorkflowRepository } from '../repositories/agent-hitl-workflow.repository';

@Service()
export class AgentApprovalCleanupService {
	constructor(
		private readonly jobs: AgentBackgroundJobRepository,
		private readonly background: AgentBackgroundJobService,
		private readonly checkpoints: N8NCheckpointStorage,
		private readonly executions: ExecutionPersistence,
		private readonly owners: AgentHitlWorkflowRepository,
	) {}

	async cleanupAgent(agentId: string, projectId: string, ownerId: string | null): Promise<void> {
		const jobs = await this.jobs.findUnconsumedApprovalsForAgent(agentId);
		for (const job of jobs) {
			if (!job.parentRunId) continue;
			const state = await this.checkpoints.getStatus(job.parentRunId, agentId);
			if (state.status === 'active' && state.checkpoint.status === 'suspended') {
				if (await this.checkpoints.cancelSuspended(job.parentRunId, state.checkpoint, agentId))
					continue;
			}
			if (state.status !== 'expired')
				throw new ConflictError(
					'An Agent approval is still stopping. Stop its session and retry deletion.',
				);
		}
		// Cancel the checkpoint before stopping the child, so its completion cannot resume the Agent.
		for (const threadId of new Set(jobs.map((job) => job.parentThreadId)))
			await this.background.cancelForSession(agentId, threadId);
		for (const job of jobs) {
			if (job.parentRunId) await this.checkpoints.delete(job.parentRunId, agentId);
		}
		if (!ownerId) return;
		await this.executions.hardDeleteByWorkflowId(ownerId);
		await this.owners.deleteExecutionOwner(projectId, agentId, ownerId);
	}
}

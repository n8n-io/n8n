import type { SerializableAgentState } from '@n8n/agents';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';

import { ExecutionPersistence } from '@/executions/execution-persistence';

import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentHitlWorkflowRepository } from '../repositories/agent-hitl-workflow.repository';

type ApprovalCleanupState =
	| { action: 'safe' }
	| { action: 'cancel'; runId: string; checkpoint: SerializableAgentState }
	| { action: 'blocked' };

const STILL_STOPPING = 'An Agent approval is still stopping. Stop its session and retry deletion.';

@Service()
export class AgentApprovalCleanupService {
	constructor(
		private readonly jobs: AgentBackgroundJobRepository,
		private readonly background: AgentBackgroundJobService,
		private readonly checkpoints: N8NCheckpointStorage,
		private readonly executions: ExecutionPersistence,
		private readonly owners: AgentHitlWorkflowRepository,
		private readonly agentExecutions: AgentExecutionRepository,
	) {}

	/**
	 * Check the approval blockers of `cleanupAgent` without changes.
	 * Call it before a step that cannot be undone.
	 */
	async assertCanCleanupAgent(agentId: string): Promise<void> {
		for (const job of await this.jobs.findUnconsumedApprovalsForAgent(agentId)) {
			if ((await this.classify(job, agentId)).action === 'blocked')
				throw new ConflictError(STILL_STOPPING);
		}
	}

	async cleanupAgent(agentId: string, projectId: string, ownerId: string | null): Promise<void> {
		const jobs = await this.jobs.findUnconsumedApprovalsForAgent(agentId);
		for (const job of jobs) {
			const state = await this.classify(job, agentId);
			if (state.action === 'safe') continue;
			if (
				state.action === 'cancel' &&
				(await this.checkpoints.cancelSuspended(state.runId, state.checkpoint, agentId))
			)
				continue;
			throw new ConflictError(STILL_STOPPING);
		}
		// Cancel the checkpoint before stopping the child, so its completion cannot resume the Agent.
		for (const threadId of new Set(jobs.map((job) => job.parentThreadId)))
			await this.background.cancelForSession(agentId, threadId);
		for (const job of jobs) {
			if (job.parentRunId) await this.checkpoints.delete(job.parentRunId, agentId);
		}
		// No checkpoint can consume these receipts now. Active receipts stay and block the final delete.
		await this.jobs.consumeSettledApprovals(jobs.map((job) => job.id));
		if (!ownerId) return;
		// Detach first, so no new run can use the owner while its history drains.
		await this.owners.detachExecutionOwner(projectId, agentId, ownerId);
		await this.executions.hardDeleteByWorkflowId(ownerId);
		await this.owners.deleteDetachedExecutionOwner(ownerId);
	}

	private async classify(job: AgentBackgroundJob, agentId: string): Promise<ApprovalCleanupState> {
		if (!job.parentRunId) return { action: 'safe' };
		const state = await this.checkpoints.getStatus(job.parentRunId, agentId);
		if (state.status === 'expired') return { action: 'safe' };
		if (state.status === 'not-found') {
			// The run stopped before it saved a checkpoint. Only a running parent can still save it.
			return (await this.agentExecutions.existsRunningByThread(job.parentThreadId))
				? { action: 'blocked' }
				: { action: 'safe' };
		}
		if (state.checkpoint.status === 'suspended')
			return { action: 'cancel', runId: job.parentRunId, checkpoint: state.checkpoint };
		return { action: 'blocked' };
	}
}

import { Service } from '@n8n/di';
import type { AgentPendingApproval } from '@n8n/api-types';
import { UserError } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionService } from '@/executions/execution.service';

import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { AgentBackgroundJobRepository } from '../repositories/agent-background-job.repository';

@Service()
export class AgentHitlRequestsService {
	constructor(
		private readonly jobs: AgentBackgroundJobRepository,
		private readonly jobService: AgentBackgroundJobService,
		private readonly executions: ExecutionPersistence,
		private readonly executionService: ExecutionService,
		private readonly checkpoints: N8NCheckpointStorage,
	) {}

	async list(agentId: string): Promise<AgentPendingApproval[]> {
		return (await this.jobs.listPendingApprovals(agentId)).map((job) => ({
			id: job.id,
			title: job.title,
			status: job.status,
			requestedAt: job.createdAt.toISOString(),
			threadId: job.parentThreadId,
			workflowExecutionId: job.childExecutionId,
		}));
	}

	async cancel(agentId: string, id: string): Promise<void> {
		const job = await this.jobs.findById(id);
		if (!job || job.parentAgentId !== agentId || job.kind !== 'approval' || !job.childExecutionId) {
			throw new UserError('Approval request not found');
		}
		const child = await this.executions.findSingleExecution(job.childExecutionId, {
			includeData: true,
			unflattenData: true,
		});
		const run = child?.data.parentAgentRun;
		if (!run?.workflowCaller || run.agentId !== agentId)
			throw new UserError('The approval caller is unavailable');
		await this.checkpoints.delete(run.runId, agentId);
		await this.executionService.stop(run.workflowCaller.executionId, [
			run.workflowCaller.workflowId,
		]);
		for (const pending of await this.jobs.findByParentThread(job.parentThreadId)) {
			if (
				pending.parentAgentId !== agentId ||
				pending.parentRunId !== run.runId ||
				pending.kind !== 'approval' ||
				!pending.childExecutionId
			)
				continue;
			await this.jobService.cancel(pending.parentThreadId, pending.id);
			await this.jobs.consumeApprovalJob(pending.childExecutionId);
		}
	}
}

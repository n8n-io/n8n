import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';
import { UnexpectedError } from 'n8n-workflow';

import { AgentTaskService } from '../agent-task.service';
import { AgentRepository } from '../repositories/agent.repository';
import { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import { AGENT_TASK_TASK_TYPE, isAgentTaskJobPayload } from './agent-task-job';
import { AgentTaskJobRegistrar } from './agent-task-job-registrar';

/**
 * Runs a due agent-task occurrence.
 *
 * The handoff is starting the run: take the run lock, kick the agent run off
 * in the background, report dispatched. The run itself lasts minutes — far
 * beyond the occurrence's lease, which is never renewed mid-run — so the
 * handler must not wait for it. Overlap and redelivery are bounded by the
 * `agent_task_run_lock` the run holds, not by the lease.
 */
@Service()
export class AgentTaskTaskHandler implements TaskHandler {
	readonly taskType = AGENT_TASK_TASK_TYPE;

	constructor(
		private logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly taskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly agentTaskService: AgentTaskService,
		private readonly registrar: AgentTaskJobRegistrar,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		if (!isAgentTaskJobPayload(task.payload)) {
			throw new UnexpectedError('Agent-task payload is missing agentId or taskId', {
				extra: { taskId: task.id, jobId: task.jobId },
			});
		}
		const { agentId, taskId } = task.payload;

		// The published config is the source of truth at fire time. An occurrence
		// whose task no longer qualifies is stale: complete it without effect and
		// re-reconcile so the job that produced it goes away.
		const runnable = await this.isRunnable(agentId, taskId);
		if (!runnable) {
			this.logger.warn('Dropping occurrence of an agent task that is no longer scheduled', {
				agentId,
				taskId,
				jobId: task.jobId,
			});
			this.selfHeal(agentId);
			return report.notDispatched();
		}

		const outcome = await this.agentTaskService.startScheduledRun(agentId, taskId);
		if (outcome === 'skipped-active') {
			// Previous run still holds the lock: skip this tick, like the in-memory
			// scheduler. The occurrence completes; the next tick is a fresh one.
			return report.notDispatched();
		}

		this.logger.debug('Handed off agent-task occurrence to a run', {
			agentId,
			taskId,
			jobId: task.jobId,
		});
		return report.dispatched();
	}

	/** Whether the task is still part of the agent's published, enabled config. */
	private async isRunnable(agentId: string, taskId: string): Promise<boolean> {
		const agent = await this.agentRepository.findById(agentId);
		if (!agent?.activeVersionId) return false;

		const snapshot = await this.taskSnapshotRepository.findByVersionAndTaskId(
			agent.activeVersionId,
			taskId,
		);
		return snapshot !== null && snapshot.enabled;
	}

	/** Remove the stale job behind this occurrence; best-effort, off the hot path. */
	private selfHeal(agentId: string): void {
		void this.registrar.reconcile(agentId).catch((error) => {
			this.logger.warn('Failed to reconcile an agent after a stale occurrence', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}
}

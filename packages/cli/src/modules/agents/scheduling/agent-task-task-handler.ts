import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';
import { UnexpectedError } from 'n8n-workflow';

import { AgentTaskService } from '../agent-task.service';
import { AGENT_TASK_TASK_TYPE, isAgentTaskJobPayload } from './agent-task-job';
import { AgentTaskJobRegistrar } from './agent-task-job-registrar';

/**
 * Runs a due agent-task occurrence.
 *
 * The handoff is the start of the run. The handler takes the run lock, starts
 * the agent run in the background, and reports dispatched. The run lasts
 * minutes, far more than the lease of the occurrence, and nothing renews the
 * lease during the run. So the handler must not wait for the run. The
 * `agent_task_run_lock` that the run holds bounds overlap and redelivery.
 *
 * The handoff also ends the crash protection of the scheduler. A main that
 * dies after the lock and before the run records its `agent_execution` row
 * leaves no trace, and the lock blocks the next ticks until its TTL ends. The
 * in-memory scheduler has the same gap. Once `@n8n/scheduler` can renew the
 * lease during a handler, the handler can await the run instead, and the
 * reaper then covers a crash at any point of the run.
 */
@Service()
export class AgentTaskTaskHandler implements TaskHandler {
	readonly taskType = AGENT_TASK_TASK_TYPE;

	constructor(
		private logger: Logger,
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

		const outcome = await this.agentTaskService.startScheduledRun(agentId, taskId);
		if (outcome === 'stale') {
			// The task no longer qualifies under the published config. The handler
			// completes the occurrence without effect and reconciles again, so
			// that the job that produced it goes away.
			this.logger.warn('Dropping occurrence of an agent task that is no longer scheduled', {
				agentId,
				taskId,
				jobId: task.jobId,
			});
			this.selfHeal(agentId);
			return report.notDispatched();
		}
		if (outcome === 'skipped-active') {
			// The previous run still holds the lock. The handler skips this tick,
			// the same as the in-memory scheduler. The occurrence completes, and
			// the next tick is a fresh one.
			return report.notDispatched();
		}

		this.logger.debug('Handed off agent-task occurrence to a run', {
			agentId,
			taskId,
			jobId: task.jobId,
		});
		return report.dispatched();
	}

	/** Removes the stale job behind this occurrence. Best-effort, off the hot path. */
	private selfHeal(agentId: string): void {
		void this.registrar.reconcile(agentId).catch((error) => {
			this.logger.warn('Failed to reconcile an agent after a stale occurrence', {
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}
}

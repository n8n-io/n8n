import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AgentExecutionService } from './agent-execution.service';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

@Service()
export class AgentInterruptedExecutionSweeper {
	static readonly LIVENESS_GRACE_MS = 2 * 60 * 1000;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly backgroundJobService: AgentBackgroundJobService,
		private readonly agentsConfig: AgentsConfig,
	) {
		this.logger = this.logger.scoped('agents');
	}

	async sweep(): Promise<void> {
		let running;
		try {
			running = await this.executionRepository.findRunning();
		} catch (error) {
			this.logger.error('Failed to query running agent executions', { error });
			return;
		}

		for (const execution of running) {
			try {
				if (
					execution.updatedAt.getTime() >
					Date.now() - AgentInterruptedExecutionSweeper.LIVENESS_GRACE_MS
				) {
					continue;
				}
				if (await this.executionService.finalizeInterruptedExecution(execution)) {
					this.logger.info('Marked abandoned agent execution as interrupted', {
						executionId: execution.id,
						threadId: execution.threadId,
					});
				}
			} catch (error) {
				this.logger.error('Failed to finalize interrupted agent execution', {
					executionId: execution.id,
					threadId: execution.threadId,
					error,
				});
			}
		}

		// Background job rows ride along on the same cadence: after abandoned
		// child executions were marked interrupted above, reconciliation can
		// settle the job rows that pointed at them (plus timed-out ones).
		// Workflow-job reconciliation runs even with the feature flag off, so
		// rows created while it was on cannot strand as `running`.
		try {
			if (this.agentsConfig.backgroundTasksEnabled) {
				await this.backgroundJobService.reconcile();
			} else {
				await this.backgroundJobService.reconcileWorkflowJobs();
			}
		} catch (error) {
			this.logger.error('Failed to reconcile background job rows', { error });
		}
	}
}

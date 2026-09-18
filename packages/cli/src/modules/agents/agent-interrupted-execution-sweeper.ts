import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AgentExecutionService } from './agent-execution.service';
import { AgentMessageQueueService } from './agent-message-queue.service';
import { AgentConversationLeaseService } from './agent-conversation-lease.service';
import { AgentConversationLeaseTimeoutError } from './agent-conversation-lease.types';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import { AgentWakeService } from './background/agent-wake.service';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

@Service()
export class AgentInterruptedExecutionSweeper {
	static readonly LIVENESS_GRACE_MS = AgentMessageQueueService.LIVENESS_GRACE_MS;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionService: AgentExecutionService,
		private readonly backgroundJobService: AgentBackgroundJobService,
		private readonly agentWakeService: AgentWakeService,
		private readonly agentsConfig: AgentsConfig,
		private readonly messageQueue: AgentMessageQueueService,
		private readonly leases: AgentConversationLeaseService,
		private readonly threadRepository: AgentExecutionThreadRepository,
	) {
		this.logger = this.logger.scoped('agents');
	}

	async sweep(): Promise<void> {
		const graceMs = AgentInterruptedExecutionSweeper.LIVENESS_GRACE_MS;
		let running;
		try {
			running = await this.executionRepository.findStaleRunning(graceMs);
		} catch (error) {
			this.logger.error('Failed to query running agent executions', { error });
			return;
		}

		for (const execution of running) {
			try {
				const thread = await this.threadRepository.findOneBy({ id: execution.threadId });
				if (!thread) continue;
				await this.leases.withLease(
					thread.agentId,
					execution.threadId,
					async () => {
						const current = await this.executionRepository.findRunningById(execution.id);
						if (!current) return;
						if (await this.executionService.finalizeInterruptedExecution(current, graceMs)) {
							this.logger.info('Marked abandoned agent execution as interrupted', {
								executionId: execution.id,
								threadId: execution.threadId,
							});
						}
					},
					{ waitTimeoutMs: 250 },
				);
			} catch (error) {
				if (error instanceof AgentConversationLeaseTimeoutError) continue;
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

		try {
			await this.agentWakeService.drainUnconsumed();
		} catch (error) {
			this.logger.error('Failed to schedule delivery of pending background job results', { error });
		}

		await this.messageQueue.recover();
	}
}

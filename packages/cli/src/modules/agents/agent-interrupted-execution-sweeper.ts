import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentExecutionJournalService } from './agent-execution-journal.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

@Service()
export class AgentInterruptedExecutionSweeper {
	static readonly LIVENESS_GRACE_MS = 2 * 60 * 1000;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly journalService: AgentExecutionJournalService,
		private readonly executionService: AgentExecutionService,
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
				if (this.journalService.isLive(execution.id)) continue;
				const lastEventAt = await this.journalService.lastActivityAt(execution.id);
				const lastActivity = Math.max(
					lastEventAt?.getTime() ?? 0,
					execution.updatedAt?.getTime() ?? 0,
					execution.startedAt?.getTime() ?? 0,
				);
				if (lastActivity > Date.now() - AgentInterruptedExecutionSweeper.LIVENESS_GRACE_MS) {
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
	}
}

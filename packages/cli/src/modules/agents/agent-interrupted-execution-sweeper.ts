import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentExecutionService } from './agent-execution.service';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

@Service()
export class AgentInterruptedExecutionSweeper {
	static readonly LIVENESS_GRACE_MS = 2 * 60 * 1000;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
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
	}
}

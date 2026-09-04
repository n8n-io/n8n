import type { CrashedExecution } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

/**
 * Marks executions as `crashed`. A crash transition runs no execution lifecycle
 * hooks, so the workflow statistics are counted from here instead.
 */
@Service()
export class ExecutionCrashService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowStatisticsService: WorkflowStatisticsService,
	) {}

	async markAsCrashed(executionIds: string | string[]): Promise<CrashedExecution[]> {
		return await this.executionRepository.markAsCrashed(executionIds, (batch) => {
			if (batch.length === 0) return;

			this.workflowStatisticsService.emit('executionsCrashed', { executions: batch });
		});
	}
}

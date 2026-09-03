import type { CrashedExecution } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

@Service()
export class ExecutionCrashService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowStatisticsService: WorkflowStatisticsService,
	) {}

	async markAsCrashed(executionIds: string | string[]): Promise<CrashedExecution[]> {
		const crashed = await this.executionRepository.markAsCrashed(executionIds);

		for (const { workflowId, mode } of crashed) {
			this.workflowStatisticsService.emit('executionCrashed', { workflowId, mode });
		}

		return crashed;
	}
}

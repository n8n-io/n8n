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
		return await this.executionRepository.markAsCrashed(executionIds, (batch) => this.count(batch));
	}

	/**
	 * Mark executions as `crashed` without counting them. For a caller that fires
	 * `workflowExecuteAfter` for the same executions, which counts them itself.
	 */
	async markAsCrashedWithoutCounting(executionIds: string | string[]): Promise<void> {
		await this.executionRepository.markAsCrashed(executionIds);
	}

	async markWorkflowExecutionsAsCrashed(workflowId: string): Promise<CrashedExecution[]> {
		const crashed = await this.executionRepository.markWorkflowExecutionsAsCrashed(workflowId);

		this.count(crashed);

		return crashed;
	}

	private count(executions: CrashedExecution[]) {
		if (executions.length === 0) return;

		this.workflowStatisticsService.emit('executionsCrashed', { executions });
	}
}

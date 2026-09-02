import { LicenseState } from '@n8n/backend-common';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { TestRun } from '@n8n/db';
import { TestCaseExecutionRepository, TestRunRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { PaymentRequiredError } from '@/errors/response-errors/payment-required.error';

type Pagination = { offset: number; limit: number };

/**
 * Read-side service for evaluation test runs and their cases. Public API
 * handlers call these methods instead of reaching repositories directly.
 */
@Service()
export class EvaluationTestRunService {
	constructor(
		private readonly testRunRepository: TestRunRepository,
		private readonly testCaseExecutionRepository: TestCaseExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly licenseState: LicenseState,
	) {}

	async findManyAndCount(workflowId: string, pagination: Pagination, status?: TestRun['status']) {
		const [testRuns, count] = await Promise.all([
			this.testRunRepository.getMany(workflowId, pagination, status),
			this.testRunRepository.countByWorkflowId(workflowId, status),
		]);
		return { testRuns, count };
	}

	async findSummaryByWorkflowId(runId: string, workflowId: string) {
		return await this.testRunRepository.getTestRunSummaryByWorkflowId(runId, workflowId);
	}

	async findOneByIdAndWorkflowId(runId: string, workflowId: string) {
		return await this.testRunRepository.findOneByIdAndWorkflowId(runId, workflowId);
	}

	async findTestCasesAndCount(runId: string, workflowId: string, pagination: Pagination) {
		if (!(await this.testRunRepository.existsInWorkflow(runId, workflowId))) {
			return null;
		}

		const [testCases, count] = await Promise.all([
			this.testCaseExecutionRepository.getManyByTestRunId(runId, pagination),
			this.testCaseExecutionRepository.countByTestRunId(runId),
		]);
		return { testCases, count };
	}

	/**
	 * Quota: at most N distinct workflows may have test runs (`-1` = unlimited);
	 * a workflow that already has runs re-runs freely.
	 */
	async assertEvaluationQuotaAvailable(workflowId: string) {
		const limit = this.licenseState.getMaxWorkflowsWithEvaluations();
		if (limit === UNLIMITED_LICENSE_QUOTA) return;

		if ((await this.testRunRepository.countByWorkflowId(workflowId)) > 0) return;

		const used = await this.workflowRepository.getWorkflowsWithEvaluationCount();
		if (used >= limit) {
			throw new PaymentRequiredError(
				`Evaluation quota exceeded: ${used}/${limit} workflows already have evaluations`,
			);
		}
	}
}

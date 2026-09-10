import type { LicenseState } from '@n8n/backend-common';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type {
	TestCaseExecution,
	TestCaseExecutionRepository,
	TestRun,
	TestRunRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { PaymentRequiredError } from '@/errors/response-errors/payment-required.error';

import { EvaluationTestRunService } from '../evaluation-test-run.service';

describe('EvaluationTestRunService', () => {
	let service: EvaluationTestRunService;
	let testRunRepository: Mocked<TestRunRepository>;
	let testCaseExecutionRepository: Mocked<TestCaseExecutionRepository>;
	let workflowRepository: Mocked<WorkflowRepository>;
	let licenseState: Mocked<LicenseState>;

	beforeEach(() => {
		testRunRepository = mock<TestRunRepository>();
		testCaseExecutionRepository = mock<TestCaseExecutionRepository>();
		workflowRepository = mock<WorkflowRepository>();
		licenseState = mock<LicenseState>();
		licenseState.getMaxWorkflowsWithEvaluations.mockReturnValue(UNLIMITED_LICENSE_QUOTA);
		service = new EvaluationTestRunService(
			testRunRepository,
			testCaseExecutionRepository,
			workflowRepository,
			licenseState,
		);
	});

	describe('findManyAndCount', () => {
		it('lists and counts test runs for a workflow', async () => {
			const testRuns = [{ id: 'run-1', testCaseCount: 2 }] as Awaited<
				ReturnType<TestRunRepository['getMany']>
			>;
			testRunRepository.getMany.mockResolvedValueOnce(testRuns);
			testRunRepository.countByWorkflowId.mockResolvedValueOnce(3);

			const result = await service.findManyAndCount('wf-1', { offset: 0, limit: 10 }, 'completed');

			expect(testRunRepository.getMany).toHaveBeenCalledWith(
				'wf-1',
				{ offset: 0, limit: 10 },
				'completed',
			);
			expect(testRunRepository.countByWorkflowId).toHaveBeenCalledWith('wf-1', 'completed');
			expect(result).toEqual({ testRuns, count: 3 });
		});
	});

	describe('findSummaryByWorkflowId', () => {
		it('returns the summary when the run belongs to the workflow', async () => {
			const summary = { id: 'run-1' } as Awaited<
				ReturnType<TestRunRepository['getTestRunSummaryByWorkflowId']>
			>;
			testRunRepository.getTestRunSummaryByWorkflowId.mockResolvedValueOnce(summary);

			expect(await service.findSummaryByWorkflowId('run-1', 'wf-1')).toBe(summary);
			expect(testRunRepository.getTestRunSummaryByWorkflowId).toHaveBeenCalledWith('run-1', 'wf-1');
		});

		it('returns null when the run is missing or belongs to another workflow', async () => {
			testRunRepository.getTestRunSummaryByWorkflowId.mockResolvedValueOnce(null);
			expect(await service.findSummaryByWorkflowId('run-1', 'wf-other')).toBeNull();
		});
	});

	describe('findOneByIdAndWorkflowId', () => {
		it('returns the run when it belongs to the workflow', async () => {
			const testRun = { id: 'run-1' } as TestRun;
			testRunRepository.findOneByIdAndWorkflowId.mockResolvedValueOnce(testRun);

			expect(await service.findOneByIdAndWorkflowId('run-1', 'wf-1')).toBe(testRun);
			expect(testRunRepository.findOneByIdAndWorkflowId).toHaveBeenCalledWith('run-1', 'wf-1');
		});
	});

	describe('findTestCasesAndCount', () => {
		it('returns null when the run is missing or belongs to another workflow', async () => {
			testRunRepository.existsInWorkflow.mockResolvedValueOnce(false);

			expect(
				await service.findTestCasesAndCount('run-1', 'wf-1', { offset: 0, limit: 2 }),
			).toBeNull();
			expect(testCaseExecutionRepository.getManyByTestRunId).not.toHaveBeenCalled();
		});

		it('lists and counts test cases when the run belongs to the workflow', async () => {
			const testCases = [{ id: 'case-1' }] as TestCaseExecution[];
			testRunRepository.existsInWorkflow.mockResolvedValueOnce(true);
			testCaseExecutionRepository.getManyByTestRunId.mockResolvedValueOnce(testCases);
			testCaseExecutionRepository.countByTestRunId.mockResolvedValueOnce(4);

			const result = await service.findTestCasesAndCount('run-1', 'wf-1', { offset: 0, limit: 2 });

			expect(testCaseExecutionRepository.getManyByTestRunId).toHaveBeenCalledWith('run-1', {
				offset: 0,
				limit: 2,
			});
			expect(testCaseExecutionRepository.countByTestRunId).toHaveBeenCalledWith('run-1');
			expect(result).toEqual({ testCases, count: 4 });
		});
	});

	describe('assertEvaluationQuotaAvailable', () => {
		it('skips counting when the quota is unlimited', async () => {
			await service.assertEvaluationQuotaAvailable('wf-1');

			expect(testRunRepository.countByWorkflowId).not.toHaveBeenCalled();
			expect(workflowRepository.getWorkflowsWithEvaluationCount).not.toHaveBeenCalled();
		});

		it('allows a re-run of a workflow that already has test runs', async () => {
			licenseState.getMaxWorkflowsWithEvaluations.mockReturnValueOnce(1);
			testRunRepository.countByWorkflowId.mockResolvedValueOnce(2);

			await expect(service.assertEvaluationQuotaAvailable('wf-1')).resolves.toBeUndefined();
			expect(workflowRepository.getWorkflowsWithEvaluationCount).not.toHaveBeenCalled();
		});

		it('throws when a new workflow would exceed the quota', async () => {
			licenseState.getMaxWorkflowsWithEvaluations.mockReturnValueOnce(1);
			testRunRepository.countByWorkflowId.mockResolvedValueOnce(0);
			workflowRepository.getWorkflowsWithEvaluationCount.mockResolvedValueOnce(1);

			await expect(service.assertEvaluationQuotaAvailable('wf-1')).rejects.toBeInstanceOf(
				PaymentRequiredError,
			);
		});
	});
});

import type { ExecutionsConfig } from '@n8n/config';
import type { WorkflowRepository } from '@n8n/db';
import type { IRun, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { WorkflowRunner } from '@/workflow-runner';

import type { WorkflowTest } from '../database/entities/workflow-test.entity';
import type { DiffInput, TestDiffService } from '../test-diff.service';
import { WorkflowTestRunnerService } from '../workflow-test-runner.service';
import type { WorkflowTestRunResult } from '../workflow-tests.types';

describe('WorkflowTestRunnerService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const executionsConfig = mock<ExecutionsConfig>({ mode: 'regular' });
	const testDiffService = mock<TestDiffService>();

	let service: WorkflowTestRunnerService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new WorkflowTestRunnerService(
			workflowRepository,
			workflowRunner,
			activeExecutions,
			executionsConfig,
			testDiffService,
		);
	});

	function buildTest(overrides: Partial<WorkflowTest> = {}): WorkflowTest {
		return {
			id: 'test-1',
			name: 'My Test',
			workflowId: 'workflow-1',
			sourceExecutionId: 'execution-0',
			triggerNodeName: 'Trigger',
			fixtures: { Trigger: [{ json: { a: 1 } }] },
			expectations: [{ nodeName: 'Set', executionIndex: 1, outputs: [[{ json: { a: 1 } }]] }],
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		} as unknown as WorkflowTest;
	}

	it('runs the workflow with pinned fixtures and returns the diffed result', async () => {
		const workflow = {
			id: 'workflow-1',
			name: 'Test workflow',
			nodes: [
				{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Set', type: 'n8n-nodes-base.set' },
			],
			connections: {},
			settings: { existing: 'setting' },
		};
		workflowRepository.get.mockResolvedValue(workflow as never);

		const executionId = 'execution-123';
		workflowRunner.run.mockResolvedValue(executionId);

		const run = {
			data: {
				resultData: {
					runData: { Set: [{ executionIndex: 1, data: { main: [[{ json: { a: 1 } }]] } }] },
					error: undefined,
				},
			},
		} as unknown as IRun;
		activeExecutions.getPostExecutePromise.mockResolvedValue(run);

		const expectedResult: WorkflowTestRunResult = {
			testId: 'test-1',
			testName: 'My Test',
			executionId,
			status: 'passed',
			nodeResults: [{ nodeName: 'Set', status: 'passed' }],
			completedAt: '2026-01-01T00:00:00.000Z',
		};
		testDiffService.diff.mockReturnValue(expectedResult);

		const test = buildTest();
		const result = await service.runTest(test, 'user-1');

		expect(result).toEqual(expectedResult);

		expect(workflowRepository.get).toHaveBeenCalledWith({ id: 'workflow-1' });

		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		const runArg: IWorkflowExecutionDataProcess = workflowRunner.run.mock.calls[0][0];
		expect(runArg.executionMode).toBe('evaluation');
		expect(runArg.pinData).toEqual(test.fixtures);
		expect(runArg.triggerToStartFrom).toEqual({ name: 'Trigger' });
		expect(runArg.suppressErrorWorkflow).toBe(true);
		expect(runArg.forceFullExecutionData).toBe(true);
		expect(runArg.userId).toBe('user-1');
		expect(runArg.workflowData).toEqual({
			...workflow,
			settings: {
				existing: 'setting',
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				saveExecutionProgress: false,
			},
		});
		expect(runArg.executionData).toBeUndefined();

		expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith(executionId);

		const diffArg: DiffInput = testDiffService.diff.mock.calls[0][0];
		expect(diffArg.testId).toBe('test-1');
		expect(diffArg.testName).toBe('My Test');
		expect(diffArg.executionId).toBe(executionId);
		expect(diffArg.expectations).toEqual(test.expectations);
		expect(diffArg.actualRunData).toEqual(run.data.resultData.runData);
		expect(diffArg.runError).toBeUndefined();
	});

	it('throws when the workflow cannot be found', async () => {
		workflowRepository.get.mockResolvedValue(null);

		const test = buildTest();
		let caughtError: unknown;
		await service.runTest(test, 'user-1').catch((error: unknown) => {
			caughtError = error;
		});

		expect(caughtError).toBeInstanceOf(NotFoundError);
		expect(caughtError).toHaveProperty('message', 'Workflow workflow-1 not found');
		expect(workflowRunner.run).not.toHaveBeenCalled();
	});

	it('returns a stale error result without running when the trigger node no longer exists', async () => {
		const workflow = {
			id: 'workflow-1',
			name: 'Test workflow',
			// No node named 'Trigger' -- the workflow was edited since the test was captured.
			nodes: [{ name: 'Set', type: 'n8n-nodes-base.set' }],
			connections: {},
			settings: {},
		};
		workflowRepository.get.mockResolvedValue(workflow as never);

		const test = buildTest();
		const result = await service.runTest(test, 'user-1');

		expect(result).toEqual({
			testId: 'test-1',
			testName: 'My Test',
			executionId: null,
			status: 'error',
			nodeResults: [],
			errorMessage: expect.stringContaining('node "Trigger" no longer exists in the workflow'),
			completedAt: expect.any(String),
		});
		expect(workflowRunner.run).not.toHaveBeenCalled();
		expect(testDiffService.diff).not.toHaveBeenCalled();
	});

	it('returns a stale error result without running when a fixture node no longer exists', async () => {
		const workflow = {
			id: 'workflow-1',
			name: 'Test workflow',
			// Trigger still exists, but the mocked node referenced by the fixtures was removed.
			nodes: [{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }],
			connections: {},
			settings: {},
		};
		workflowRepository.get.mockResolvedValue(workflow as never);

		const test = buildTest({ fixtures: { RemovedNode: [{ json: { a: 1 } }] } });
		const result = await service.runTest(test, 'user-1');

		expect(result).toEqual({
			testId: 'test-1',
			testName: 'My Test',
			executionId: null,
			status: 'error',
			nodeResults: [],
			errorMessage: expect.stringContaining('node "RemovedNode" no longer exists in the workflow'),
			completedAt: expect.any(String),
		});
		expect(workflowRunner.run).not.toHaveBeenCalled();
		expect(testDiffService.diff).not.toHaveBeenCalled();
	});

	it('populates executionData via createRunExecutionData when executionsConfig.mode is queue', async () => {
		const workflow = {
			id: 'workflow-1',
			name: 'Test workflow',
			nodes: [
				{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Set', type: 'n8n-nodes-base.set' },
			],
			connections: {},
			settings: {},
		};
		workflowRepository.get.mockResolvedValue(workflow as never);
		workflowRunner.run.mockResolvedValue('execution-123');
		activeExecutions.getPostExecutePromise.mockResolvedValue(undefined);
		testDiffService.diff.mockReturnValue(mock<WorkflowTestRunResult>());

		executionsConfig.mode = 'queue';
		try {
			const test = buildTest();
			await service.runTest(test, 'user-1');

			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			const runArg: IWorkflowExecutionDataProcess = workflowRunner.run.mock.calls[0][0];

			expect(runArg.executionData).toBeDefined();
			const executionData = runArg.executionData!;
			expect(executionData.resultData.pinData).toEqual(test.fixtures);
			expect(executionData.manualData).toEqual({
				userId: 'user-1',
				triggerToStartFrom: { name: 'Trigger' },
				suppressErrorWorkflow: true,
			});
		} finally {
			executionsConfig.mode = 'regular';
		}
	});
});

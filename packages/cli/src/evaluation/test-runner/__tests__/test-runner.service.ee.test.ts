import type { SelectQueryBuilder } from '@n8n/typeorm';
import { stringify } from 'flatted';
import { readFileSync } from 'fs';
import { mock, mockDeep } from 'jest-mock-extended';
import type { GenericValue, IRun } from 'n8n-workflow';
import path from 'path';

import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { TestDefinition } from '@/databases/entities/test-definition.ee';
import type { TestMetric } from '@/databases/entities/test-metric.ee';
import type { TestRun } from '@/databases/entities/test-run.ee';
import type { User } from '@/databases/entities/user';
import type { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { TestMetricRepository } from '@/databases/repositories/test-metric.repository.ee';
import type { TestRunRepository } from '@/databases/repositories/test-run.repository.ee';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { WorkflowRunner } from '@/workflow-runner';

import { TestRunnerService } from '../test-runner.service.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

const wfEvaluationJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.evaluation.json'), { encoding: 'utf-8' }),
);

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json'), { encoding: 'utf-8' }),
);

const executionMocks = [
	mock<ExecutionEntity>({
		id: 'some-execution-id',
		workflowId: 'workflow-under-test-id',
		status: 'success',
		executionData: {
			data: stringify(executionDataJson),
		},
	}),
	mock<ExecutionEntity>({
		id: 'some-execution-id-2',
		workflowId: 'workflow-under-test-id',
		status: 'success',
		executionData: {
			data: stringify(executionDataJson),
		},
	}),
];

function mockExecutionData() {
	return mock<IRun>({
		data: {
			resultData: {
				runData: {},
			},
		},
	});
}

function mockEvaluationExecutionData(metrics: Record<string, GenericValue>) {
	return mock<IRun>({
		data: {
			resultData: {
				lastNodeExecuted: 'lastNode',
				runData: {
					lastNode: [
						{
							data: {
								main: [
									[
										{
											json: metrics,
										},
									],
								],
							},
						},
					],
				},
			},
		},
	});
}

describe('TestRunnerService', () => {
	const executionRepository = mock<ExecutionRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const testRunRepository = mock<TestRunRepository>();
	const testMetricRepository = mock<TestMetricRepository>();

	beforeEach(() => {
		const executionsQbMock = mockDeep<SelectQueryBuilder<ExecutionEntity>>({
			fallbackMockImplementation: jest.fn().mockReturnThis(),
		});

		executionsQbMock.getMany.mockResolvedValueOnce(executionMocks);
		executionRepository.createQueryBuilder.mockReturnValueOnce(executionsQbMock);
		executionRepository.findOne
			.calledWith(expect.objectContaining({ where: { id: 'some-execution-id' } }))
			.mockResolvedValueOnce(executionMocks[0]);
		executionRepository.findOne
			.calledWith(expect.objectContaining({ where: { id: 'some-execution-id-2' } }))
			.mockResolvedValueOnce(executionMocks[1]);

		testRunRepository.createTestRun.mockResolvedValue(mock<TestRun>({ id: 'test-run-id' }));

		testMetricRepository.find.mockResolvedValue([
			mock<TestMetric>({ name: 'metric1' }),
			mock<TestMetric>({ name: 'metric2' }),
		]);
	});

	afterEach(() => {
		activeExecutions.getPostExecutePromise.mockClear();
		workflowRunner.run.mockClear();
		testRunRepository.createTestRun.mockClear();
		testRunRepository.markAsRunning.mockClear();
		testRunRepository.markAsCompleted.mockClear();
	});

	test('should create an instance of TestRunnerService', async () => {
		const testRunnerService = new TestRunnerService(
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testMetricRepository,
		);

		expect(testRunnerService).toBeInstanceOf(TestRunnerService);
	});

	test('should create and run test cases from past executions', async () => {
		const testRunnerService = new TestRunnerService(
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testMetricRepository,
		);

		workflowRepository.findById.calledWith('workflow-under-test-id').mockResolvedValueOnce({
			id: 'workflow-under-test-id',
			...wfUnderTestJson,
		});

		workflowRepository.findById.calledWith('evaluation-workflow-id').mockResolvedValueOnce({
			id: 'evaluation-workflow-id',
			...wfEvaluationJson,
		});

		workflowRunner.run.mockResolvedValue('test-execution-id');

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [],
			}),
		);

		expect(executionRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
		expect(executionRepository.findOne).toHaveBeenCalledTimes(2);
		expect(workflowRunner.run).toHaveBeenCalledTimes(2);
	});

	test('should run both workflow under test and evaluation workflow', async () => {
		const testRunnerService = new TestRunnerService(
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testMetricRepository,
		);

		workflowRepository.findById.calledWith('workflow-under-test-id').mockResolvedValueOnce({
			id: 'workflow-under-test-id',
			...wfUnderTestJson,
		});

		workflowRepository.findById.calledWith('evaluation-workflow-id').mockResolvedValueOnce({
			id: 'evaluation-workflow-id',
			...wfEvaluationJson,
		});

		workflowRunner.run.mockResolvedValueOnce('some-execution-id');
		workflowRunner.run.mockResolvedValueOnce('some-execution-id-2');
		workflowRunner.run.mockResolvedValueOnce('some-execution-id-3');
		workflowRunner.run.mockResolvedValueOnce('some-execution-id-4');

		// Mock executions of workflow under test
		activeExecutions.getPostExecutePromise
			.calledWith('some-execution-id')
			.mockResolvedValue(mockExecutionData());

		activeExecutions.getPostExecutePromise
			.calledWith('some-execution-id-3')
			.mockResolvedValue(mockExecutionData());

		// Mock executions of evaluation workflow
		activeExecutions.getPostExecutePromise
			.calledWith('some-execution-id-2')
			.mockResolvedValue(mockEvaluationExecutionData({ metric1: 1, metric2: 0 }));

		activeExecutions.getPostExecutePromise
			.calledWith('some-execution-id-4')
			.mockResolvedValue(mockEvaluationExecutionData({ metric1: 0.5 }));

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [{ name: 'When clicking ‘Test workflow’' }],
			}),
		);

		expect(workflowRunner.run).toHaveBeenCalledTimes(4);

		// Check workflow under test was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'evaluation',
				pinData: {
					'When clicking ‘Test workflow’':
						executionDataJson.resultData.runData['When clicking ‘Test workflow’'][0].data.main[0],
				},
				workflowData: expect.objectContaining({
					id: 'workflow-under-test-id',
				}),
			}),
		);

		// Check evaluation workflow was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'evaluation',
				executionData: expect.objectContaining({
					executionData: expect.objectContaining({
						nodeExecutionStack: expect.arrayContaining([
							expect.objectContaining({ data: expect.anything() }),
						]),
					}),
				}),
				workflowData: expect.objectContaining({
					id: 'evaluation-workflow-id',
				}),
			}),
		);

		// Check Test Run status was updated correctly
		expect(testRunRepository.createTestRun).toHaveBeenCalledTimes(1);
		expect(testRunRepository.markAsRunning).toHaveBeenCalledTimes(1);
		expect(testRunRepository.markAsRunning).toHaveBeenCalledWith('test-run-id');
		expect(testRunRepository.markAsCompleted).toHaveBeenCalledTimes(1);
		expect(testRunRepository.markAsCompleted).toHaveBeenCalledWith('test-run-id', {
			metric1: 0.75,
			metric2: 0,
		});
	});
});

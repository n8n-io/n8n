import type { User } from '@n8n/db';
import type { ExecutionEntity } from '@n8n/db';
import type { TestDefinition } from '@n8n/db';
import type { TestMetric } from '@n8n/db';
import type { TestRun } from '@n8n/db';
import type { ExecutionRepository } from '@n8n/db';
import type { TestCaseExecutionRepository } from '@n8n/db';
import type { TestMetricRepository } from '@n8n/db';
import type { TestRunRepository } from '@n8n/db';
import type { WorkflowRepository } from '@n8n/db';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { stringify } from 'flatted';
import { readFileSync } from 'fs';
import { mock, mockDeep } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { ITaskData } from 'n8n-workflow';
import type { ExecutionError, GenericValue, IRun } from 'n8n-workflow';
import path from 'path';

import type { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import { mockInstance, mockLogger } from '@test/mocking';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

import { TestRunnerService } from '../test-runner.service.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

const wfUnderTestRenamedNodesJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test-renamed-nodes.json'), {
		encoding: 'utf-8',
	}),
);

const wfEvaluationJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.evaluation.json'), { encoding: 'utf-8' }),
);

const wfEvaluationMiddleJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.evaluation-middle.json'), {
		encoding: 'utf-8',
	}),
);

const wfMultipleTriggersJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.multiple-triggers.json'), {
		encoding: 'utf-8',
	}),
);

const executionDataJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.json'), { encoding: 'utf-8' }),
);

const executionDataRenamedNodesJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data-renamed-nodes.json'), {
		encoding: 'utf-8',
	}),
);

const executionDataMultipleTriggersJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.multiple-triggers.json'), {
		encoding: 'utf-8',
	}),
);

const executionDataMultipleTriggersJson2 = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/execution-data.multiple-triggers-2.json'), {
		encoding: 'utf-8',
	}),
);

const executionMocks = [
	mock<ExecutionEntity>({
		id: 'past-execution-id',
		workflowId: 'workflow-under-test-id',
		status: 'success',
		executionData: {
			data: stringify(executionDataJson),
			workflowData: wfUnderTestJson,
		},
		metadata: [
			{
				key: 'testRunId',
				value: 'test-run-id',
			},
		],
	}),
	mock<ExecutionEntity>({
		id: 'past-execution-id-2',
		workflowId: 'workflow-under-test-id',
		status: 'success',
		executionData: {
			data: stringify(executionDataRenamedNodesJson),
			workflowData: wfUnderTestRenamedNodesJson,
		},
		metadata: [],
	}),
];

function mockExecutionData() {
	return mock<IRun>({
		data: {
			resultData: {
				runData: {
					'When clicking ‘Execute workflow’': mock<ITaskData[]>(),
				},
				// error is an optional prop, but jest-mock-extended will mock it by default,
				// which affects the code logic. So, we need to explicitly set it to undefined.
				error: undefined,
			},
		},
	});
}

function mockErrorExecutionData() {
	return mock<IRun>({
		data: {
			resultData: {
				error: mock<ExecutionError>(),
			},
		},
	});
}

function mockEvaluationExecutionData(metrics: Record<string, GenericValue>) {
	return mock<IRun>({
		data: {
			resultData: {
				lastNodeExecuted: 'Success',
				runData: {
					Success: [
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
					Fail: [
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
				// error is an optional prop, but jest-mock-extended will mock it by default,
				// which affects the code logic. So, we need to explicitly set it to undefined.
				error: undefined,
			},
		},
	});
}

function mockEvaluationMiddleExecutionData(
	firstMetrics: Record<string, GenericValue>,
	secondMetrics: Record<string, GenericValue>,
) {
	// Clone the metrics to avoid modifying the passed object
	// For test assertions, these run-data need special handling
	const runData: Record<string, any> = {
		'First Metric': [
			{
				data: {
					main: [
						[
							{
								json: firstMetrics,
							},
						],
					],
				},
			},
		],
		Success: [
			{
				data: {
					main: [
						[
							{
								json: secondMetrics,
							},
						],
					],
				},
			},
		],
	};

	return mock<IRun>({
		data: {
			resultData: {
				lastNodeExecuted: 'Success',
				runData,
				error: undefined,
			},
		},
	});
}

const errorReporter = mock<ErrorReporter>();
const logger = mockLogger();
const telemetry = mock<Telemetry>();

async function mockLongExecutionPromise(data: IRun, delay: number): Promise<IRun> {
	return await new Promise((resolve) => {
		setTimeout(() => resolve(data), delay);
	});
}

describe('TestRunnerService', () => {
	const executionRepository = mock<ExecutionRepository>({
		manager: { transaction: (cb: any) => cb() },
	});
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const testRunRepository = mock<TestRunRepository>();
	const testMetricRepository = mock<TestMetricRepository>();
	const testCaseExecutionRepository = mock<TestCaseExecutionRepository>();

	const mockNodeTypes = mockInstance(NodeTypes);
	mockInstance(LoadNodesAndCredentials, {
		loadedNodes: mockNodeTypesData(['manualTrigger', 'set', 'if', 'code']),
	});

	beforeEach(() => {
		const executionsQbMock = mockDeep<SelectQueryBuilder<ExecutionEntity>>({
			fallbackMockImplementation: jest.fn().mockReturnThis(),
		});

		executionsQbMock.getMany.mockResolvedValueOnce(executionMocks);
		executionRepository.createQueryBuilder.mockReturnValueOnce(executionsQbMock);
		executionRepository.findOne
			.calledWith(expect.objectContaining({ where: { id: 'past-execution-id' } }))
			.mockResolvedValueOnce(executionMocks[0]);
		executionRepository.findOne
			.calledWith(expect.objectContaining({ where: { id: 'past-execution-id-2' } }))
			.mockResolvedValueOnce(executionMocks[1]);

		testRunRepository.createTestRun.mockResolvedValue(mock<TestRun>({ id: 'test-run-id' }));

		testMetricRepository.find.mockResolvedValue([
			mock<TestMetric>({ name: 'metric1' }),
			mock<TestMetric>({ name: 'metric2' }),
		]);
	});

	afterEach(() => {
		jest.resetAllMocks();
		testRunRepository.incrementFailed.mockClear();
		testRunRepository.incrementPassed.mockClear();
	});

	test('should create an instance of TestRunnerService', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		expect(testRunnerService).toBeInstanceOf(TestRunnerService);
	});

	test('should create and run test cases from past executions', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		workflowRepository.findById.calledWith('workflow-under-test-id').mockResolvedValueOnce({
			id: 'workflow-under-test-id',
			...wfUnderTestJson,
		});

		workflowRepository.findById.calledWith('evaluation-workflow-id').mockResolvedValueOnce({
			id: 'evaluation-workflow-id',
			...wfEvaluationJson,
		});

		workflowRunner.run.mockResolvedValue('some-execution-id');

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
			}),
		);

		expect(executionRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
		expect(executionRepository.findOne).toHaveBeenCalledTimes(2);
		expect(workflowRunner.run).toHaveBeenCalled();
	});

	test('should run both workflow under test and evaluation workflow', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
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
			.mockResolvedValue(mockEvaluationExecutionData({ metric1: 0.5, metric2: 100 }));

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
			}),
		);

		expect(workflowRunner.run).toHaveBeenCalledTimes(4);

		// Check workflow under test was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'evaluation',
				pinData: {
					'When clicking ‘Execute workflow’':
						executionDataJson.resultData.runData['When clicking ‘Execute workflow’'][0].data
							.main[0],
				},
				workflowData: expect.objectContaining({
					id: 'workflow-under-test-id',
				}),
			}),
		);

		// Check evaluation workflow was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'integrated',
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
		expect(testRunRepository.markAsRunning).toHaveBeenCalledWith('test-run-id', expect.any(Number));
		expect(testRunRepository.markAsCompleted).toHaveBeenCalledTimes(1);
		expect(testRunRepository.markAsCompleted).toHaveBeenCalledWith('test-run-id', {
			metric1: 0.75,
		});

		expect(testRunRepository.incrementPassed).toHaveBeenCalledTimes(2);
		expect(testRunRepository.incrementFailed).not.toHaveBeenCalled();
	});

	test('should properly count passed and failed executions', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
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
			.mockRejectedValue(new Error('Some error'));

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [],
			}),
		);

		expect(testRunRepository.incrementPassed).toHaveBeenCalledTimes(1);
		expect(testRunRepository.incrementFailed).toHaveBeenCalledTimes(1);
	});

	test('should properly count failed test executions', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
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
			.mockResolvedValue(mockErrorExecutionData());

		// Mock executions of evaluation workflow
		activeExecutions.getPostExecutePromise
			.calledWith('some-execution-id-2')
			.mockResolvedValue(mockEvaluationExecutionData({ metric1: 1, metric2: 0 }));

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [],
			}),
		);

		expect(testRunRepository.incrementPassed).toHaveBeenCalledTimes(1);
		expect(testRunRepository.incrementFailed).toHaveBeenCalledTimes(1);
	});

	test('should properly count failed evaluations', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
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
			.mockResolvedValue(mockErrorExecutionData());

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [],
			}),
		);

		expect(testRunRepository.incrementPassed).toHaveBeenCalledTimes(1);
		expect(testRunRepository.incrementFailed).toHaveBeenCalledTimes(1);
	});

	test('should specify correct start nodes when running workflow under test', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
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
				mockedNodes: [{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
			}),
		);

		expect(workflowRunner.run).toHaveBeenCalledTimes(4);

		// Check workflow under test was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'evaluation',
				pinData: {
					'When clicking ‘Execute workflow’':
						executionDataJson.resultData.runData['When clicking ‘Execute workflow’'][0].data
							.main[0],
				},
				workflowData: expect.objectContaining({
					id: 'workflow-under-test-id',
				}),
				triggerToStartFrom: expect.objectContaining({
					name: 'When clicking ‘Execute workflow’',
				}),
			}),
		);
	});

	test('should properly choose trigger and start nodes', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		const startNodesData = (testRunnerService as any).getStartNodesData(
			wfMultipleTriggersJson,
			executionDataMultipleTriggersJson,
			wfMultipleTriggersJson, // Test case where workflow didn't change
		);

		expect(startNodesData).toEqual({
			startNodes: expect.arrayContaining([expect.objectContaining({ name: 'NoOp' })]),
			triggerToStartFrom: expect.objectContaining({
				name: 'When clicking ‘Execute workflow’',
			}),
		});
	});

	test('should properly choose trigger and start nodes 2', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		const startNodesData = (testRunnerService as any).getStartNodesData(
			wfMultipleTriggersJson,
			executionDataMultipleTriggersJson2,
			wfMultipleTriggersJson, // Test case where workflow didn't change
		);

		expect(startNodesData).toEqual({
			startNodes: expect.arrayContaining([expect.objectContaining({ name: 'NoOp' })]),
			triggerToStartFrom: expect.objectContaining({
				name: 'When chat message received',
			}),
		});
	});

	test('should properly run test when nodes were renamed', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
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
				mockedNodes: [{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
			}),
		);

		expect(executionRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
		expect(executionRepository.findOne).toHaveBeenCalledTimes(2);
		expect(workflowRunner.run).toHaveBeenCalledTimes(2);
	});

	test('should properly choose trigger when it was renamed', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		const startNodesData = (testRunnerService as any).getStartNodesData(
			wfUnderTestRenamedNodesJson, // Test case where workflow didn't change
			executionDataJson,
			wfUnderTestJson,
		);

		expect(startNodesData).toEqual({
			startNodes: expect.arrayContaining([expect.objectContaining({ name: 'Set attribute' })]),
			triggerToStartFrom: expect.objectContaining({
				name: 'Manual Run',
			}),
		});
	});

	test('should create proper execution data for queue mode in runTestCase', async () => {
		config.set('executions.mode', 'queue');

		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		// Spy on workflowRunner.run to capture the data passed to it
		jest.spyOn(workflowRunner, 'run').mockImplementation(async (data) => {
			// Verify the data structure is correct for queue mode
			expect(data.executionMode).toBe('evaluation');

			// Check that executionData field is properly defined
			expect(data.executionData).toBeDefined();
			expect(data.executionData!.startData).toBeDefined();
			expect(data.executionData!.startData!.startNodes).toBeDefined();
			expect(data.executionData!.resultData.pinData).toBeDefined();
			expect(data.executionData!.resultData.runData).toBeDefined();
			expect(data.executionData!.manualData!.userId).toBeDefined();
			expect(data.executionData!.manualData!.partialExecutionVersion).toBe(2);
			expect(data.executionData!.manualData!.triggerToStartFrom).toBeDefined();

			return 'mock-execution-id';
		});

		// Mock activeExecutions.getPostExecutePromise to return a successful execution
		activeExecutions.getPostExecutePromise.mockResolvedValue(mockExecutionData());

		// Create an AbortController for the test
		const abortController = new AbortController();

		// Setup test metadata
		const metadata: any = {
			testRunId: 'test-run-id',
			userId: 'user-id',
			pastExecutionId: 'past-execution-id',
		};

		// Call runTestCase directly to test the executionData construction
		await (testRunnerService as any).runTestCase(
			wfUnderTestJson,
			executionDataJson,
			wfUnderTestJson,
			[{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
			metadata,
			abortController.signal,
		);

		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
	});

	test('should create proper execution data for regular mode in runTestCase', async () => {
		config.set('executions.mode', 'regular');

		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		// Spy on workflowRunner.run to capture the data passed to it
		jest.spyOn(workflowRunner, 'run').mockImplementation(async (data) => {
			expect(data.executionMode).toBe('evaluation');

			// Check that executionData field is NOT defined
			expect(data.executionData).not.toBeDefined();

			return 'mock-execution-id';
		});

		// Mock activeExecutions.getPostExecutePromise to return a successful execution
		activeExecutions.getPostExecutePromise.mockResolvedValue(mockExecutionData());

		// Create an AbortController for the test
		const abortController = new AbortController();

		// Setup test metadata
		const metadata: any = {
			testRunId: 'test-run-id',
			userId: 'user-id',
			pastExecutionId: 'past-execution-id',
		};

		// Call runTestCase directly to test the executionData construction
		await (testRunnerService as any).runTestCase(
			wfUnderTestJson,
			executionDataJson,
			wfUnderTestJson,
			[{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
			metadata,
			abortController.signal,
		);

		expect(workflowRunner.run).toHaveBeenCalledTimes(1);
	});

	test('should run workflow with metrics defined in the middle of the workflow', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		workflowRepository.findById.calledWith('workflow-under-test-id').mockResolvedValueOnce({
			id: 'workflow-under-test-id',
			...wfUnderTestJson,
		});

		workflowRepository.findById.calledWith('evaluation-workflow-id').mockResolvedValueOnce({
			id: 'evaluation-workflow-id',
			...wfEvaluationMiddleJson,
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
			.mockResolvedValue(mockEvaluationMiddleExecutionData({ metric2: 1 }, { metric1: 1 }));

		activeExecutions.getPostExecutePromise
			.calledWith('some-execution-id-4')
			.mockResolvedValue(mockEvaluationMiddleExecutionData({ metric2: 2 }, { metric1: 0.5 }));

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
			}),
		);

		expect(workflowRunner.run).toHaveBeenCalledTimes(4);

		// Check workflow under test was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'evaluation',
				pinData: {
					'When clicking ‘Execute workflow’':
						executionDataJson.resultData.runData['When clicking ‘Execute workflow’'][0].data
							.main[0],
				},
				workflowData: expect.objectContaining({
					id: 'workflow-under-test-id',
				}),
			}),
		);

		// Check evaluation workflow was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'integrated',
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
		expect(testRunRepository.markAsRunning).toHaveBeenCalledWith('test-run-id', expect.any(Number));
		expect(testRunRepository.markAsCompleted).toHaveBeenCalledTimes(1);
		expect(testRunRepository.markAsCompleted).toHaveBeenCalledWith('test-run-id', {
			metric1: 0.75,
			metric2: 1.5,
		});

		expect(testRunRepository.incrementPassed).toHaveBeenCalledTimes(2);
		expect(testRunRepository.incrementFailed).not.toHaveBeenCalled();
	});

	test('should properly override metrics from earlier nodes with later ones', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			executionRepository,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			testMetricRepository,
			mockNodeTypes,
			errorReporter,
		);

		workflowRepository.findById.calledWith('workflow-under-test-id').mockResolvedValueOnce({
			id: 'workflow-under-test-id',
			...wfUnderTestJson,
		});

		workflowRepository.findById.calledWith('evaluation-workflow-id').mockResolvedValueOnce({
			id: 'evaluation-workflow-id',
			...wfEvaluationMiddleJson,
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
			.mockResolvedValue(
				mockEvaluationMiddleExecutionData({ metric2: 5 }, { metric1: 1, metric2: 5 }),
			);

		activeExecutions.getPostExecutePromise
			.calledWith('some-execution-id-4')
			.mockResolvedValue(
				mockEvaluationMiddleExecutionData({ metric2: 10 }, { metric1: 0.5, metric2: 10 }),
			);

		await testRunnerService.runTest(
			mock<User>(),
			mock<TestDefinition>({
				workflowId: 'workflow-under-test-id',
				evaluationWorkflowId: 'evaluation-workflow-id',
				mockedNodes: [{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
			}),
		);

		expect(workflowRunner.run).toHaveBeenCalledTimes(4);

		// Check workflow under test was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'evaluation',
				pinData: {
					'When clicking ‘Execute workflow’':
						executionDataJson.resultData.runData['When clicking ‘Execute workflow’'][0].data
							.main[0],
				},
				workflowData: expect.objectContaining({
					id: 'workflow-under-test-id',
				}),
			}),
		);

		// Check evaluation workflow was executed
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({
				executionMode: 'integrated',
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
		expect(testRunRepository.markAsRunning).toHaveBeenCalledWith('test-run-id', expect.any(Number));
		expect(testRunRepository.markAsCompleted).toHaveBeenCalledTimes(1);
		expect(testRunRepository.markAsCompleted).toHaveBeenCalledWith('test-run-id', {
			metric1: 0.75,
			metric2: 7.5,
		});

		expect(testRunRepository.incrementPassed).toHaveBeenCalledTimes(2);
		expect(testRunRepository.incrementFailed).not.toHaveBeenCalled();
	});

	describe('Test Run cancellation', () => {
		beforeAll(() => {
			jest.useFakeTimers();
		});

		test('should cancel test run', async () => {
			const testRunnerService = new TestRunnerService(
				logger,
				telemetry,
				workflowRepository,
				workflowRunner,
				executionRepository,
				activeExecutions,
				testRunRepository,
				testCaseExecutionRepository,
				testMetricRepository,
				mockNodeTypes,
				errorReporter,
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

			// Mock long execution of workflow under test
			activeExecutions.getPostExecutePromise
				.calledWith('some-execution-id')
				.mockReturnValue(mockLongExecutionPromise(mockExecutionData(), 1000));

			activeExecutions.getPostExecutePromise
				.calledWith('some-execution-id-3')
				.mockReturnValue(mockLongExecutionPromise(mockExecutionData(), 1000));

			// Mock executions of evaluation workflow
			activeExecutions.getPostExecutePromise
				.calledWith('some-execution-id-2')
				.mockReturnValue(
					mockLongExecutionPromise(mockEvaluationExecutionData({ metric1: 1, metric2: 0 }), 1000),
				);

			activeExecutions.getPostExecutePromise
				.calledWith('some-execution-id-4')
				.mockReturnValue(
					mockLongExecutionPromise(mockEvaluationExecutionData({ metric1: 0.5 }), 1000),
				);

			// Do not await here to test canceling
			void testRunnerService.runTest(
				mock<User>(),
				mock<TestDefinition>({
					workflowId: 'workflow-under-test-id',
					evaluationWorkflowId: 'evaluation-workflow-id',
					mockedNodes: [{ id: '72256d90-3a67-4e29-b032-47df4e5768af' }],
				}),
			);

			// Simulate the moment when first test case is running (wf under test execution)
			await jest.advanceTimersByTimeAsync(100);
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);

			const abortController = (testRunnerService as any).abortControllers.get('test-run-id');
			expect(abortController).toBeDefined();

			await testRunnerService.cancelTestRun('test-run-id');

			expect(abortController.signal.aborted).toBe(true);
			expect(activeExecutions.stopExecution).toBeCalledWith('some-execution-id');
		});

		afterAll(() => {
			jest.useRealTimers();
		});
	});
});

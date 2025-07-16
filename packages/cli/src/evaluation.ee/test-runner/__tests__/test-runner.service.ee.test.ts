import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import type {
	TestRun,
	TestCaseExecutionRepository,
	TestRunRepository,
	WorkflowRepository,
} from '@n8n/db';
import { readFileSync } from 'fs';
import type { Mock } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import { EVALUATION_NODE_TYPE, EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { IWorkflowBase, IRun, ExecutionError } from 'n8n-workflow';
import path from 'path';

import type { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { TestRunError } from '@/evaluation.ee/test-runner/errors.ee';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

import { TestRunnerService } from '../test-runner.service.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

const errorReporter = mock<ErrorReporter>();
const logger = mockLogger();
const telemetry = mock<Telemetry>();

describe('TestRunnerService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const testRunRepository = mock<TestRunRepository>();
	const testCaseExecutionRepository = mock<TestCaseExecutionRepository>();
	let testRunnerService: TestRunnerService;

	mockInstance(LoadNodesAndCredentials, {
		loadedNodes: mockNodeTypesData(['manualTrigger', 'set', 'if', 'code', 'evaluation']),
	});

	beforeEach(() => {
		testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			errorReporter,
		);

		testRunRepository.createTestRun.mockResolvedValue(mock<TestRun>({ id: 'test-run-id' }));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('findEvaluationTriggerNode', () => {
		test('should find the trigger node in a workflow', () => {
			// Setup a test workflow with a trigger node
			const workflowWithTrigger = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Dataset Trigger',
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'node2',
						name: 'Regular Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [100, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			// Use the protected method via any type casting
			const result = (testRunnerService as any).findEvaluationTriggerNode(workflowWithTrigger);

			// Assert the result is the correct node
			expect(result).toBeDefined();
			expect(result.type).toBe(EVALUATION_TRIGGER_NODE_TYPE);
			expect(result.name).toBe('Dataset Trigger');
		});

		test('should return undefined when no trigger node is found', () => {
			// Setup a test workflow without a trigger node
			const workflowWithoutTrigger = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Regular Node 1',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'node2',
						name: 'Regular Node 2',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [100, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			// Call the function and expect undefined result
			const result = (testRunnerService as any).findEvaluationTriggerNode(workflowWithoutTrigger);
			expect(result).toBeUndefined();
		});

		test('should work with the actual workflow.under-test.json', () => {
			const result = (testRunnerService as any).findEvaluationTriggerNode(wfUnderTestJson);

			// Assert the result is the correct node
			expect(result).toBeDefined();
			expect(result.type).toBe(EVALUATION_TRIGGER_NODE_TYPE);
			expect(result.name).toBe('When fetching a dataset row');
		});
	});

	describe('extractDatasetTriggerOutput', () => {
		test('should extract trigger output data from execution', () => {
			// Create workflow with a trigger node
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			// Create execution data with output for the trigger node
			const mockOutputItems = [
				{ json: { id: 1, name: 'Test 1' } },
				{ json: { id: 2, name: 'Test 2' } },
			];

			const execution = mock<IRun>({
				data: {
					resultData: {
						runData: {
							TriggerNode: [
								{
									data: {
										main: [mockOutputItems],
									},
									error: undefined,
								},
							],
						},
					},
				},
			});

			// Call the method
			const result = (testRunnerService as any).extractDatasetTriggerOutput(execution, workflow);

			// Verify results
			expect(result).toEqual(mockOutputItems);
		});

		test('should throw an error if trigger node output is not present', () => {
			// Create workflow with a trigger node
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			// Create execution data with missing output
			const execution = mock<IRun>({
				data: {
					resultData: {
						runData: {},
					},
				},
			});

			// Expect the method to throw an error
			expect(() => {
				(testRunnerService as any).extractDatasetTriggerOutput(execution, workflow);
			}).toThrow(TestRunError);

			// Verify the error has the correct code
			try {
				(testRunnerService as any).extractDatasetTriggerOutput(execution, workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('TEST_CASES_NOT_FOUND');
			}
		});

		test('should throw an error if evaluation trigger could not fetch data', () => {
			// Create workflow with a trigger node
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			// Create execution data with missing output
			const execution = mock<IRun>({
				data: {
					resultData: {
						runData: {
							TriggerNode: [
								{
									error: mock<ExecutionError>(),
								},
							],
						},
					},
				},
			});

			// Expect the method to throw an error
			expect(() => {
				(testRunnerService as any).extractDatasetTriggerOutput(execution, workflow);
			}).toThrow(TestRunError);

			// Verify the error has the correct code
			try {
				(testRunnerService as any).extractDatasetTriggerOutput(execution, workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('CANT_FETCH_TEST_CASES');
			}
		});

		test('should throw an error if trigger node output is empty list', () => {
			// Create workflow with a trigger node
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			// Create execution data with missing output
			const execution = mock<IRun>({
				data: {
					resultData: {
						runData: {
							TriggerNode: [
								{
									data: {
										main: [[]], // Empty list
									},
									error: undefined,
								},
							],
						},
					},
				},
			});

			// Expect the method to throw an error
			expect(() => {
				(testRunnerService as any).extractDatasetTriggerOutput(execution, workflow);
			}).toThrow(TestRunError);

			// Verify the error has the correct code
			try {
				(testRunnerService as any).extractDatasetTriggerOutput(execution, workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('TEST_CASES_NOT_FOUND');
			}
		});

		test('should work with actual execution data format', () => {
			// Create workflow with a trigger node that matches the name in the actual data
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'triggerNodeId',
						name: "When clicking 'Execute workflow'",
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			// Mock execution data similar to actual format
			const expectedItems = [
				{ json: { query: 'First item' }, pairedItem: { item: 0 } },
				{ json: { query: 'Second item' }, pairedItem: { item: 0 } },
				{ json: { query: 'Third item' }, pairedItem: { item: 0 } },
			];

			// TODO: change with actual data
			const execution = mock<IRun>({
				data: {
					resultData: {
						runData: {
							"When clicking 'Execute workflow'": [
								{
									data: {
										main: [expectedItems],
									},
									error: undefined,
								},
							],
						},
					},
				},
			});

			// Call the method
			const result = (testRunnerService as any).extractDatasetTriggerOutput(execution, workflow);

			// Verify results
			expect(result).toEqual(expectedItems);
		});
	});

	describe('runDatasetTrigger', () => {
		beforeEach(() => {
			// Setup mock execution response
			const mockExecutionId = 'mock-execution-id';
			const mockExecutionData = mock<IRun>({
				data: {
					resultData: {
						runData: {},
					},
				},
			});

			// Setup workflowRunner mock
			workflowRunner.run.mockResolvedValue(mockExecutionId);

			// Setup activeExecutions mock
			activeExecutions.getPostExecutePromise.mockResolvedValue(mockExecutionData);
		});

		test('should throw an error if trigger node is not found', async () => {
			// Create workflow without a trigger node
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Regular Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			const metadata = {
				testRunId: 'test-run-id',
				userId: 'user-id',
			};

			// Call the method and expect it to throw an error
			await expect(
				(testRunnerService as any).runDatasetTrigger(workflow, metadata),
			).rejects.toThrow(TestRunError);

			// Verify the error has the correct code
			try {
				await (testRunnerService as any).runDatasetTrigger(workflow, metadata);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('EVALUATION_TRIGGER_NOT_FOUND');
			}
		});

		test('should call workflowRunner.run with correct data in normal execution mode', async () => {
			// Create workflow with a trigger node
			const triggerNodeName = 'Dataset Trigger';
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
				settings: {
					saveDataErrorExecution: 'all',
				},
			});

			const metadata = {
				testRunId: 'test-run-id',
				userId: 'user-id',
			};

			// Call the method
			await (testRunnerService as any).runDatasetTrigger(workflow, metadata);

			// Verify workflowRunner.run was called
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);

			// Get the argument passed to workflowRunner.run
			const runCallArg = workflowRunner.run.mock.calls[0][0];

			// Verify it has the correct structure
			expect(runCallArg).toHaveProperty('destinationNode', triggerNodeName);
			expect(runCallArg).toHaveProperty('executionMode', 'manual');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveManualExecutions', false);
			expect(runCallArg).toHaveProperty('workflowData.settings.saveDataErrorExecution', 'none');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveDataSuccessExecution', 'none');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveExecutionProgress', false);
			expect(runCallArg).toHaveProperty('userId', metadata.userId);
			expect(runCallArg).toHaveProperty('partialExecutionVersion', 2);

			expect(runCallArg).toHaveProperty('executionData.executionData.nodeExecutionStack');
			const nodeExecutionStack = runCallArg.executionData?.executionData?.nodeExecutionStack;
			expect(nodeExecutionStack).toBeInstanceOf(Array);
			expect(nodeExecutionStack).toHaveLength(1);
			expect(nodeExecutionStack?.[0]).toHaveProperty('node.name', triggerNodeName);
			expect(nodeExecutionStack?.[0]).toHaveProperty('node.forceCustomOperation', {
				resource: 'dataset',
				operation: 'getRows',
			});
			expect(nodeExecutionStack?.[0]).toHaveProperty('data.main[0][0].json', {});
			expect(runCallArg).toHaveProperty('workflowData.nodes[0].forceCustomOperation', {
				resource: 'dataset',
				operation: 'getRows',
			});
		});

		test('should call workflowRunner.run with correct data in queue execution mode and manual offload', async () => {
			config.set('executions.mode', 'queue');
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';

			// Create workflow with a trigger node
			const triggerNodeName = 'Dataset Trigger';
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
				settings: {
					saveDataErrorExecution: 'all',
				},
			});

			const metadata = {
				testRunId: 'test-run-id',
				userId: 'user-id',
			};

			// Call the method
			await (testRunnerService as any).runDatasetTrigger(workflow, metadata);

			// Verify workflowRunner.run was called
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);

			// Get the argument passed to workflowRunner.run
			const runCallArg = workflowRunner.run.mock.calls[0][0];

			// Verify it has the correct structure
			expect(runCallArg).toHaveProperty('destinationNode', triggerNodeName);
			expect(runCallArg).toHaveProperty('executionMode', 'manual');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveManualExecutions', false);
			expect(runCallArg).toHaveProperty('workflowData.settings.saveDataErrorExecution', 'none');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveDataSuccessExecution', 'none');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveExecutionProgress', false);
			expect(runCallArg).toHaveProperty('userId', metadata.userId);
			expect(runCallArg).toHaveProperty('partialExecutionVersion', 2);

			expect(runCallArg).not.toHaveProperty('executionData.executionData');
			expect(runCallArg).not.toHaveProperty('executionData.executionData.nodeExecutionStack');
			expect(runCallArg).toHaveProperty('workflowData.nodes[0].forceCustomOperation', {
				resource: 'dataset',
				operation: 'getRows',
			});

			// after reset
			config.set('executions.mode', 'regular');
			delete process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
		});

		test('should wait for execution to finish and return result', async () => {
			// Create workflow with a trigger node
			const triggerNodeName = 'Dataset Trigger';
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			const metadata = {
				testRunId: 'test-run-id',
				userId: 'user-id',
			};

			// Setup mock for execution ID and result
			const mockExecutionId = 'dataset-execution-id';
			const mockExecutionResult = mock<IRun>({
				data: {
					resultData: {
						runData: {
							[triggerNodeName]: [
								{
									data: {
										main: [[{ json: { test: 'data1' } }, { json: { test: 'data2' } }]],
									},
								},
							],
						},
					},
				},
			});

			workflowRunner.run.mockResolvedValue(mockExecutionId);
			activeExecutions.getPostExecutePromise.mockResolvedValue(mockExecutionResult);

			// Call the method
			const result = await (testRunnerService as any).runDatasetTrigger(workflow, metadata);

			// Verify the execution was waited for
			expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith(mockExecutionId);

			// Verify the result is correct
			expect(result).toEqual(mockExecutionResult);
		});
	});

	describe('runTestCase', () => {
		beforeEach(() => {
			// Setup mock execution response
			const mockExecutionId = 'mock-execution-id';
			const mockExecutionData = mock<IRun>({
				data: {
					resultData: {
						runData: {},
					},
				},
			});

			// Setup workflowRunner mock
			workflowRunner.run.mockResolvedValue(mockExecutionId);

			// Setup activeExecutions mock
			activeExecutions.getPostExecutePromise.mockResolvedValue(mockExecutionData);
		});

		test('should return undefined if abortSignal is aborted', async () => {
			// Create an aborted signal
			const abortController = new AbortController();
			abortController.abort();

			// Create test data
			const workflow = mock<IWorkflowBase>({
				nodes: [],
				connections: {},
			});

			const metadata = {
				testRunId: 'test-run-id',
				userId: 'user-id',
			};

			const testCase = { json: { id: 1, name: 'Test 1' } };

			// Call the method
			const result = await (testRunnerService as any).runTestCase(
				workflow,
				metadata,
				testCase,
				abortController.signal,
			);

			// Verify results
			expect(result).toBeUndefined();
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});

		test('should call workflowRunner.run with correct data', async () => {
			// Setup test data
			const triggerNodeName = 'TriggerNode';
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			const metadata = {
				testRunId: 'test-run-id',
				userId: 'user-id',
			};

			const testCase = { json: { id: 1, name: 'Test 1' } };
			const abortController = new AbortController();

			// Call the method
			await (testRunnerService as any).runTestCase(
				workflow,
				metadata,
				testCase,
				abortController.signal,
			);

			// Verify workflowRunner.run was called with the correct data
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);

			const runCallArg = workflowRunner.run.mock.calls[0][0];

			// Verify the expected structure
			expect(runCallArg).toEqual(
				expect.objectContaining({
					executionMode: 'evaluation',
					pinData: {
						[triggerNodeName]: [testCase],
					},
					workflowData: {
						...workflow,
						settings: {
							...workflow.settings,
							saveManualExecutions: true,
							saveDataErrorExecution: 'all',
							saveDataSuccessExecution: 'all',
							saveExecutionProgress: false,
						},
					},
					userId: metadata.userId,
					partialExecutionVersion: 2,
					triggerToStartFrom: {
						name: triggerNodeName,
					},
				}),
			);
		});

		test('should register abort event listener and return execution results', async () => {
			// Setup test data
			const triggerNodeName = 'TriggerNode';
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			const metadata = {
				testRunId: 'test-run-id',
				userId: 'user-id',
			};

			const testCase = { json: { id: 1, name: 'Test 1' } };
			const abortController = new AbortController();

			// Mock addEventListener on AbortSignal
			const mockAddEventListener = jest.fn();
			const originalAddEventListener = abortController.signal.addEventListener;
			abortController.signal.addEventListener = mockAddEventListener;

			try {
				// Call the method
				const result = await (testRunnerService as any).runTestCase(
					workflow,
					metadata,
					testCase,
					abortController.signal,
				);

				// Verify addEventListener was called
				expect(mockAddEventListener).toHaveBeenCalledTimes(1);
				expect(mockAddEventListener.mock.calls[0][0]).toBe('abort');

				// Verify the expected result structure
				expect(result).toHaveProperty('executionData');
				expect(result.executionData?.data).toBeDefined();
				expect(result).toHaveProperty('executionId');
				expect(result.executionId).toEqual(expect.any(String));
			} finally {
				// Restore original method
				abortController.signal.addEventListener = originalAddEventListener;
			}
		});

		describe('runTestCase - Queue Mode', () => {
			beforeEach(() => {
				// Mock config to return 'queue' mode
				jest.spyOn(config, 'getEnv').mockImplementation((key) => {
					if (key === 'executions.mode') {
						return 'queue';
					}
					return undefined;
				});
			});

			afterEach(() => {
				(config.getEnv as unknown as Mock).mockRestore();
			});

			test('should call workflowRunner.run with correct data in queue mode', async () => {
				// Setup test data
				const triggerNodeName = 'TriggerNode';
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'node1',
							name: triggerNodeName,
							type: EVALUATION_TRIGGER_NODE_TYPE,
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							forceCustomOperation: undefined,
						},
					],
					connections: {},
				});

				const metadata = {
					testRunId: 'test-run-id',
					userId: 'user-id',
				};

				const testCase = { json: { id: 1, name: 'Test 1' } };
				const abortController = new AbortController();

				// Call the method
				await (testRunnerService as any).runTestCase(
					workflow,
					metadata,
					testCase,
					abortController.signal,
				);

				// Verify workflowRunner.run was called with the correct data
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);

				const runCallArg = workflowRunner.run.mock.calls[0][0];

				// Verify the expected structure for queue mode
				expect(runCallArg).toEqual(
					expect.objectContaining({
						executionMode: 'evaluation',
						pinData: {
							[triggerNodeName]: [testCase],
						},
						workflowData: {
							...workflow,
							settings: {
								...workflow.settings,
								saveManualExecutions: true,
								saveDataErrorExecution: 'all',
								saveDataSuccessExecution: 'all',
								saveExecutionProgress: false,
							},
						},
						userId: metadata.userId,
						partialExecutionVersion: 2,
						triggerToStartFrom: {
							name: triggerNodeName,
						},
						executionData: {
							resultData: {
								pinData: {
									[triggerNodeName]: [testCase],
								},
								runData: {},
							},
							manualData: {
								userId: metadata.userId,
								partialExecutionVersion: 2,
								triggerToStartFrom: {
									name: triggerNodeName,
								},
							},
						},
					}),
				);
			});
		});
	});

	describe('validateSetMetricsNodes', () => {
		it('should pass when metrics nodes are properly configured', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setMetrics',
							metric: 'customMetrics',
							metrics: {
								assignments: [
									{
										id: '1',
										name: 'accuracy',
										value: 0.95,
									},
									{
										id: '2',
										name: 'precision',
										value: 0.87,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			}).not.toThrow();
		});

		it('should throw SET_METRICS_NODE_NOT_FOUND when no metrics nodes exist', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Regular Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_FOUND');
			}
		});

		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when metrics node has no parameters', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setMetrics',
							metric: 'customMetrics',
							metrics: undefined,
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});

		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when metrics node has empty assignments', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setMetrics',
							metric: 'customMetrics',
							metrics: {
								assignments: [],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});

		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when assignment has no name', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setMetrics',
							metric: 'customMetrics',
							metrics: {
								assignments: [
									{
										id: '1',
										name: '',
										value: 0.95,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});

		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when metrics node is disabled', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						disabled: true,
						parameters: {
							operation: 'setMetrics',
							metrics: {
								assignments: [
									{
										id: '1',
										name: 'assignment1',
										value: 0.95,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});

		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when assignment has null value', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setMetrics',
							metric: 'customMetrics',
							metrics: {
								assignments: [
									{
										id: '1',
										name: 'accuracy',
										value: null,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});

		it('should validate multiple metrics nodes successfully', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics 1',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setMetrics',
							metric: 'customMetrics',
							metrics: {
								assignments: [
									{
										id: '1',
										name: 'accuracy',
										value: 0.95,
									},
								],
							},
						},
					},
					{
						id: 'node2',
						name: 'Set Metrics 2',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [100, 0],
						parameters: {
							operation: 'setMetrics',
							metric: 'customMetrics',
							metrics: {
								assignments: [
									{
										id: '2',
										name: 'precision',
										value: 0.87,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetMetricsNodes(workflow);
			}).not.toThrow();
		});

		describe('Version-based validation', () => {
			it('should pass for version < 4.7 with valid custom metrics (no metric parameter needed)', () => {
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.6,
							position: [0, 0],
							parameters: {
								operation: 'setMetrics',
								// No metric parameter - this is expected for versions < 4.7
								metrics: {
									assignments: [
										{
											id: '1',
											name: 'accuracy',
											value: 0.95,
										},
									],
								},
							},
						},
					],
					connections: {},
				});

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});

			it('should fail for version < 4.7 with invalid custom metrics configuration', () => {
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.6,
							position: [0, 0],
							parameters: {
								operation: 'setMetrics',
								// No metric parameter - this is expected for versions < 4.7
								metrics: {
									assignments: [], // Empty assignments should fail
								},
							},
						},
					],
					connections: {},
				});

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).toThrow(TestRunError);

				try {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				} catch (error) {
					expect(error).toBeInstanceOf(TestRunError);
					expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
					expect(error.extra).toEqual({ node_name: 'Set Metrics' });
				}
			});

			it('should fail for version >= 4.7 with missing metric parameter', () => {
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.7,
							position: [0, 0],
							parameters: {
								operation: 'setMetrics',
								metrics: {
									assignments: [
										{
											id: '1',
											name: 'accuracy',
											value: 0.95,
										},
									],
								},
							},
						},
					],
					connections: {},
				});

				// Missing metric parameter - this should fail for versions >= 4.7
				workflow.nodes[0].parameters.metric = undefined;

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).toThrow(TestRunError);

				try {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				} catch (error) {
					expect(error).toBeInstanceOf(TestRunError);
					expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
					expect(error.extra).toEqual({ node_name: 'Set Metrics' });
				}
			});

			it('should pass for version >= 4.7 with valid customMetrics configuration', () => {
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.7,
							position: [0, 0],
							parameters: {
								operation: 'setMetrics',
								metric: 'customMetrics',
								metrics: {
									assignments: [
										{
											id: '1',
											name: 'accuracy',
											value: 0.95,
										},
									],
								},
							},
						},
					],
					connections: {},
				});

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});

			it('should pass for version >= 4.7 with non-customMetrics metric (no metrics validation needed)', () => {
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.7,
							position: [0, 0],
							parameters: {
								operation: 'setMetrics',
								metric: 'correctness',
								// No metrics parameter needed for non-customMetrics
							},
						},
					],
					connections: {},
				});

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});

			it('should fail for version >= 4.7 with customMetrics but invalid metrics configuration', () => {
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.7,
							position: [0, 0],
							parameters: {
								operation: 'setMetrics',
								metric: 'customMetrics',
								metrics: {
									assignments: [], // Empty assignments should fail
								},
							},
						},
					],
					connections: {},
				});

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).toThrow(TestRunError);

				try {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				} catch (error) {
					expect(error).toBeInstanceOf(TestRunError);
					expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
					expect(error.extra).toEqual({ node_name: 'Set Metrics' });
				}
			});

			it('should handle mixed versions correctly', () => {
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics Old',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.6,
							position: [0, 0],
							parameters: {
								operation: 'setMetrics',
								// No metric parameter for old version
								metrics: {
									assignments: [
										{
											id: '1',
											name: 'accuracy',
											value: 0.95,
										},
									],
								},
							},
						},
						{
							id: 'node2',
							name: 'Set Metrics New',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.7,
							position: [100, 0],
							parameters: {
								operation: 'setMetrics',
								metric: 'correctness',
								// No metrics parameter needed for non-customMetrics
							},
						},
					],
					connections: {},
				});

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});
		});
	});

	describe('validateSetOutputsNodes', () => {
		it('should pass when outputs nodes are properly configured', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setOutputs',
							outputs: {
								assignments: [
									{
										id: '1',
										name: 'result',
										value: 'success',
									},
									{
										id: '2',
										name: 'score',
										value: 95,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			}).not.toThrow();
		});

		it('should pass when operation is default (undefined)', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: undefined,
							outputs: {
								assignments: [
									{
										id: '1',
										name: 'result',
										value: 'success',
									},
									{
										id: '2',
										name: 'score',
										value: 95,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			}).not.toThrow();
		});

		it('should throw SET_OUTPUTS_NODE_NOT_CONFIGURED when outputs node has no parameters', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setOutputs',
							outputs: undefined,
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_OUTPUTS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Outputs' });
			}
		});

		it('should throw SET_OUTPUTS_NODE_NOT_CONFIGURED when outputs node has empty assignments', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setOutputs',
							outputs: {
								assignments: [],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_OUTPUTS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Outputs' });
			}
		});

		it('should throw SET_OUTPUTS_NODE_NOT_CONFIGURED when assignment has no name', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setOutputs',
							outputs: {
								assignments: [
									{
										id: '1',
										name: '',
										value: 'result',
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_OUTPUTS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Outputs' });
			}
		});

		it('should throw SET_OUTPUTS_NODE_NOT_CONFIGURED when assignment has null value', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setOutputs',
							outputs: {
								assignments: [
									{
										id: '1',
										name: 'result',
										value: null,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			}).toThrow(TestRunError);

			try {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(TestRunError);
				expect(error.code).toBe('SET_OUTPUTS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Outputs' });
			}
		});

		it('should validate multiple outputs nodes successfully', () => {
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs 1',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							operation: 'setOutputs',
							outputs: {
								assignments: [
									{
										id: '1',
										name: 'result',
										value: 'success',
									},
								],
							},
						},
					},
					{
						id: 'node2',
						name: 'Set Outputs 2',
						type: EVALUATION_NODE_TYPE,
						typeVersion: 1,
						position: [100, 0],
						parameters: {
							operation: 'setOutputs',
							outputs: {
								assignments: [
									{
										id: '2',
										name: 'score',
										value: 95,
									},
								],
							},
						},
					},
				],
				connections: {},
			});

			expect(() => {
				(testRunnerService as any).validateSetOutputsNodes(workflow);
			}).not.toThrow();
		});
	});
});

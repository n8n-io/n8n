import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { ExecutionsConfig } from '@n8n/config';
import type {
	TestRun,
	TestCaseExecutionRepository,
	TestRunRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';
import { readFileSync } from 'fs';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter, InstanceSettings } from 'n8n-core';
import {
	createRunExecutionData,
	EVALUATION_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type { IWorkflowBase, IRun, ExecutionError } from 'n8n-workflow';
import path from 'path';

import { TestRunnerService } from '../test-runner.service.ee';

import type { ActiveExecutions } from '@/active-executions';
import type { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { TestRunError } from '@/evaluation.ee/test-runner/errors.ee';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';

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
	const executionsConfig = mockInstance(ExecutionsConfig, { mode: 'regular' });
	const publisher = mock<Publisher>();
	const instanceSettings = mock<InstanceSettings>({ hostId: 'test-host-id', isMultiMain: false });
	const concurrencyControlService = mock<ConcurrencyControlService>();
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
			executionsConfig,
			mock(),
			publisher,
			instanceSettings,
			concurrencyControlService,
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
				expect(error.code).toBe('CANT_FETCH_TEST_CASES');
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
			expect(runCallArg).toHaveProperty('destinationNode', {
				nodeName: triggerNodeName,
				mode: 'inclusive',
			});
			expect(runCallArg).toHaveProperty('executionMode', 'manual');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveManualExecutions', false);
			expect(runCallArg).toHaveProperty('workflowData.settings.saveDataErrorExecution', 'none');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveDataSuccessExecution', 'none');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveExecutionProgress', false);
			expect(runCallArg).toHaveProperty('userId', metadata.userId);

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
			expect(runCallArg).toHaveProperty('forceFullExecutionData', true);
		});

		test('should call workflowRunner.run with correct data in queue execution mode and manual offload', async () => {
			const queueModeConfig = mockInstance(ExecutionsConfig, { mode: 'queue' });
			const testRunnerService = new TestRunnerService(
				logger,
				telemetry,
				workflowRepository,
				workflowRunner,
				activeExecutions,
				testRunRepository,
				testCaseExecutionRepository,
				errorReporter,
				queueModeConfig,
				mock(),
				publisher,
				instanceSettings,
				concurrencyControlService,
			);
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
			expect(runCallArg).toHaveProperty('destinationNode', {
				nodeName: triggerNodeName,
				mode: 'inclusive',
			});
			expect(runCallArg).toHaveProperty('executionMode', 'manual');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveManualExecutions', false);
			expect(runCallArg).toHaveProperty('workflowData.settings.saveDataErrorExecution', 'none');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveDataSuccessExecution', 'none');
			expect(runCallArg).toHaveProperty('workflowData.settings.saveExecutionProgress', false);
			expect(runCallArg).toHaveProperty('userId', metadata.userId);

			// In queue mode with offloading, executionData.executionData should not exist
			expect(runCallArg).not.toHaveProperty('executionData.executionData');
			expect(runCallArg).not.toHaveProperty('executionData.executionData.nodeExecutionStack');

			// But executionData itself should still exist with startData and manualData
			expect(runCallArg).toHaveProperty('executionData');
			expect(runCallArg.executionData).toBeDefined();
			expect(runCallArg).toHaveProperty('executionData.startData.destinationNode', {
				nodeName: triggerNodeName,
				mode: 'inclusive',
			});
			expect(runCallArg).toHaveProperty('executionData.manualData.userId', metadata.userId);
			expect(runCallArg).toHaveProperty(
				'executionData.manualData.triggerToStartFrom.name',
				triggerNodeName,
			);

			expect(runCallArg).toHaveProperty('workflowData.nodes[0].forceCustomOperation', {
				resource: 'dataset',
				operation: 'getRows',
			});
			expect(runCallArg).toHaveProperty('forceFullExecutionData', true);

			// after reset
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
				id: 'workflow-id',
				name: 'Test Workflow',
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
					forceFullExecutionData: true,
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
			let testRunnerService: TestRunnerService;

			beforeEach(() => {
				const queueModeConfig = mockInstance(ExecutionsConfig, { mode: 'queue' });
				testRunnerService = new TestRunnerService(
					logger,
					telemetry,
					workflowRepository,
					workflowRunner,
					activeExecutions,
					testRunRepository,
					testCaseExecutionRepository,
					errorReporter,
					queueModeConfig,
					mock(),
					publisher,
					instanceSettings,
					concurrencyControlService,
				);
			});

			test('should call workflowRunner.run with correct data in queue mode', async () => {
				// Setup test data
				const triggerNodeName = 'TriggerNode';
				const workflow = mock<IWorkflowBase>({
					id: 'workflow-id',
					name: 'Test Workflow',
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
						forceFullExecutionData: true,
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
						triggerToStartFrom: {
							name: triggerNodeName,
						},
						executionData: {
							...createRunExecutionData({
								executionData: null,
								resultData: {
									pinData: {
										[triggerNodeName]: [testCase],
									},
									runData: {},
								},
								manualData: {
									userId: metadata.userId,
									triggerToStartFrom: {
										name: triggerNodeName,
									},
								},
							}),
							resumeToken: expect.any(String),
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

		it('should throw SET_METRICS_NODE_NOT_FOUND when metrics node is disabled', () => {
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
				expect(error.code).toBe('SET_METRICS_NODE_NOT_FOUND');
				expect(error.extra).toEqual({});
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

			it('should pass for version >= 4.7 with missing metric parameter (uses default correctness) when model connected', () => {
				const workflow = mock<IWorkflowBase>({
					nodes: [
						{
							id: 'model1',
							name: 'OpenAI Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: 'node1',
							name: 'Set Metrics',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.7,
							position: [100, 0],
							parameters: {
								operation: 'setMetrics',
								// metric parameter is undefined, which means it uses the default value 'correctness'
								// This should pass since correctness is valid and has model connected
							},
						},
					],
					connections: {
						'OpenAI Model': {
							[NodeConnectionTypes.AiLanguageModel]: [
								[{ node: 'Set Metrics', type: 'ai_languageModel', index: 0 }],
							],
						},
					},
				});

				// Missing metric parameter - this should pass for versions >= 4.7 since it defaults to 'correctness' and has model
				workflow.nodes[1].parameters.metric = undefined;

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).not.toThrow();
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

			it('should pass for version >= 4.7 with non-AI metric (no model connection needed)', () => {
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
								metric: 'stringSimilarity',
								// Non-AI metrics don't need model connection
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
							id: 'model1',
							name: 'OpenAI Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: 'node1',
							name: 'Set Metrics Old',
							type: EVALUATION_NODE_TYPE,
							typeVersion: 4.6,
							position: [100, 0],
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
							position: [200, 0],
							parameters: {
								operation: 'setMetrics',
								metric: 'correctness',
								// Correctness needs model connection for version 4.7+
							},
						},
					],
					connections: {
						'OpenAI Model': {
							[NodeConnectionTypes.AiLanguageModel]: [
								[{ node: 'Set Metrics New', type: 'ai_languageModel', index: 0 }],
							],
						},
					},
				});

				expect(() => {
					(testRunnerService as any).validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});

			describe('Model connection validation', () => {
				it('should pass when correctness metric has model connected', () => {
					const workflow = mock<IWorkflowBase>({
						nodes: [
							{
								id: 'model1',
								name: 'OpenAI Model',
								type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
							{
								id: 'metrics1',
								name: 'Set Metrics',
								type: EVALUATION_NODE_TYPE,
								typeVersion: 4.7,
								position: [100, 0],
								parameters: {
									operation: 'setMetrics',
									metric: 'correctness',
								},
							},
						],
						connections: {
							'OpenAI Model': {
								[NodeConnectionTypes.AiLanguageModel]: [
									[{ node: 'Set Metrics', type: 'ai_languageModel', index: 0 }],
								],
							},
						},
					});

					expect(() => {
						(testRunnerService as any).validateSetMetricsNodes(workflow);
					}).not.toThrow();
				});

				it('should fail when correctness metric has no model connected', () => {
					const workflow = mock<IWorkflowBase>({
						nodes: [
							{
								id: 'metrics1',
								name: 'Set Metrics',
								type: EVALUATION_NODE_TYPE,
								typeVersion: 4.7,
								position: [0, 0],
								parameters: {
									operation: 'setMetrics',
									metric: 'correctness',
								},
							},
						],
						connections: {},
					});

					expect(() => {
						(testRunnerService as any).validateSetMetricsNodes(workflow);
					}).toThrow(TestRunError);
				});

				it('should pass when helpfulness metric has model connected', () => {
					const workflow = mock<IWorkflowBase>({
						nodes: [
							{
								id: 'model1',
								name: 'OpenAI Model',
								type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
							{
								id: 'metrics1',
								name: 'Set Metrics',
								type: EVALUATION_NODE_TYPE,
								typeVersion: 4.7,
								position: [100, 0],
								parameters: {
									operation: 'setMetrics',
									metric: 'helpfulness',
								},
							},
						],
						connections: {
							'OpenAI Model': {
								[NodeConnectionTypes.AiLanguageModel]: [
									[{ node: 'Set Metrics', type: 'ai_languageModel', index: 0 }],
								],
							},
						},
					});

					expect(() => {
						(testRunnerService as any).validateSetMetricsNodes(workflow);
					}).not.toThrow();
				});

				it('should fail when helpfulness metric has no model connected', () => {
					const workflow = mock<IWorkflowBase>({
						nodes: [
							{
								id: 'metrics1',
								name: 'Set Metrics',
								type: EVALUATION_NODE_TYPE,
								typeVersion: 4.7,
								position: [0, 0],
								parameters: {
									operation: 'setMetrics',
									metric: 'helpfulness',
								},
							},
						],
						connections: {},
					});

					expect(() => {
						(testRunnerService as any).validateSetMetricsNodes(workflow);
					}).toThrow(TestRunError);
				});

				it('should fail when default correctness metric (undefined) has no model connected', () => {
					const workflow = mock<IWorkflowBase>({
						nodes: [
							{
								id: 'metrics1',
								name: 'Set Metrics',
								type: EVALUATION_NODE_TYPE,
								typeVersion: 4.7,
								position: [0, 0],
								parameters: {
									operation: 'setMetrics',
									metric: undefined, // explicitly set to undefined to test default behavior
								},
							},
						],
						connections: {},
					});

					expect(() => {
						(testRunnerService as any).validateSetMetricsNodes(workflow);
					}).toThrow(TestRunError);
				});

				it('should pass when non-AI metrics (customMetrics) have no model connected', () => {
					const workflow = mock<IWorkflowBase>({
						nodes: [
							{
								id: 'metrics1',
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

				it('should pass when stringSimilarity metric has no model connected', () => {
					const workflow = mock<IWorkflowBase>({
						nodes: [
							{
								id: 'metrics1',
								name: 'Set Metrics',
								type: EVALUATION_NODE_TYPE,
								typeVersion: 4.7,
								position: [0, 0],
								parameters: {
									operation: 'setMetrics',
									metric: 'stringSimilarity',
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

	describe('runTest - parallel execution', () => {
		const TRIGGER_NODE_NAME = 'Dataset Trigger';
		const METRICS_NODE_NAME = 'Set Metrics';
		const USER = mock<{ id: string }>({ id: 'user-1' });
		const WORKFLOW_ID = 'wf-1';

		// Builds a minimal workflow that passes validateWorkflowConfiguration.
		// Using a plain object cast (not mock<IWorkflowBase>) so per-node
		// boolean fields like `disabled` read as undefined instead of being
		// auto-mocked as truthy functions by jest-mock-extended's deep proxy.
		const buildWorkflow = (): IWorkflowBase =>
			({
				id: WORKFLOW_ID,
				name: 'Eval Workflow',
				active: false,
				nodes: [
					{
						id: 'trigger',
						name: TRIGGER_NODE_NAME,
						type: EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 4.7,
						position: [0, 0] as [number, number],
						parameters: {
							source: 'dataTable',
							dataTableId: 'dt-1',
						},
					},
					{
						id: 'metrics',
						name: METRICS_NODE_NAME,
						type: EVALUATION_NODE_TYPE,
						typeVersion: 4.7,
						position: [200, 0] as [number, number],
						parameters: {
							operation: 'setMetrics',
							metric: 'customMetrics',
							metrics: {
								assignments: [{ id: '1', name: 'score', value: 1 }],
							},
						},
					},
				],
				connections: {},
				settings: {},
			}) as unknown as IWorkflowBase;

		// Dataset-trigger execution result containing N test rows.
		const buildDatasetExecution = (rowCount: number): IRun =>
			({
				data: {
					resultData: {
						runData: {
							[TRIGGER_NODE_NAME]: [
								{
									data: {
										[NodeConnectionTypes.Main]: [
											Array.from({ length: rowCount }, (_, i) => ({
												json: { caseId: i, prompt: `prompt ${i}` },
											})),
										],
									},
								},
							],
						},
					},
				},
			}) as unknown as IRun;

		// Per-case execution result with a single user-defined metric.
		const buildCaseExecution = (score: number): IRun =>
			({
				data: {
					resultData: {
						runData: {
							[METRICS_NODE_NAME]: [
								{
									data: {
										[NodeConnectionTypes.Main]: [[{ json: { score } }]],
									},
								},
							],
						},
					},
				},
			}) as unknown as IRun;

		// Wires repository and runner mocks for an N-case happy-path runTest.
		// Returns a counter object the caller can read after `runTest` resolves.
		const setupHappyPathMocks = (caseCount: number) => {
			const workflow = buildWorkflow();
			workflowRepository.findById.mockResolvedValue(workflow as never);

			// Default: throttle resolves immediately (capacity always available).
			// Tests that exercise abort-during-throttle override this.
			concurrencyControlService.throttle.mockResolvedValue(undefined as never);

			testRunRepository.markAsRunning.mockResolvedValue(undefined as never);
			testRunRepository.markAsCompleted.mockResolvedValue(undefined as never);
			testRunRepository.markAsCancelled.mockResolvedValue(undefined as never);
			testRunRepository.clearInstanceTracking.mockResolvedValue(undefined as never);
			testRunRepository.isCancellationRequested.mockResolvedValue(false);
			testCaseExecutionRepository.createTestCaseExecution.mockResolvedValue(undefined as never);
			testCaseExecutionRepository.markAllPendingAsCancelled.mockResolvedValue(undefined as never);
			// `manager` is a TypeORM EntityManager not auto-deep-mocked by mock<T>().
			// Provide a transaction stub that just invokes the callback so cancel
			// paths run end-to-end.
			Object.assign(testRunRepository, {
				manager: {
					transaction: jest
						.fn()
						.mockImplementation(async (cb: (trx: unknown) => Promise<unknown>) => await cb({})),
				},
			});

			let runCallIndex = 0;
			const inFlightTracker = { inFlight: 0, max: 0, perCaseStarted: 0 };

			workflowRunner.run.mockImplementation(async () => {
				const id = runCallIndex === 0 ? 'dataset-exec' : `case-exec-${runCallIndex}`;
				runCallIndex++;
				return id;
			});

			activeExecutions.getPostExecutePromise.mockImplementation(async (executionId) => {
				if (executionId === 'dataset-exec') {
					return buildDatasetExecution(caseCount);
				}
				inFlightTracker.inFlight++;
				inFlightTracker.perCaseStarted++;
				inFlightTracker.max = Math.max(inFlightTracker.max, inFlightTracker.inFlight);
				// Yield to the event loop so other queued tasks observably overlap.
				await new Promise((resolve) => setTimeout(resolve, 5));
				inFlightTracker.inFlight--;
				const score = parseInt(executionId.replace('case-exec-', ''), 10) / 10;
				return buildCaseExecution(score);
			});

			return { workflow, inFlightTracker };
		};

		test('concurrency=1 runs cases sequentially (max in-flight = 1)', async () => {
			const { inFlightTracker } = setupHappyPathMocks(4);

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 1);

			expect(inFlightTracker.perCaseStarted).toBe(4);
			expect(inFlightTracker.max).toBe(1);
			// 1 dataset trigger + 4 test cases.
			expect(workflowRunner.run).toHaveBeenCalledTimes(5);
			expect(testRunRepository.markAsCompleted).toHaveBeenCalledTimes(1);
			expect(testRunRepository.markAsCancelled).not.toHaveBeenCalled();
		});

		test('concurrency=3 fans out cases in parallel (max in-flight > 1)', async () => {
			const { inFlightTracker } = setupHappyPathMocks(6);

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 3);

			expect(inFlightTracker.perCaseStarted).toBe(6);
			expect(inFlightTracker.max).toBeGreaterThan(1);
			expect(inFlightTracker.max).toBeLessThanOrEqual(3);
			expect(workflowRunner.run).toHaveBeenCalledTimes(7);
			expect(testRunRepository.markAsCompleted).toHaveBeenCalledTimes(1);
		});

		test('concurrency clamped 1-10 defensively (above-bound input does not exceed cap)', async () => {
			const { inFlightTracker } = setupHappyPathMocks(12);

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 99);

			expect(inFlightTracker.perCaseStarted).toBe(12);
			expect(inFlightTracker.max).toBeLessThanOrEqual(10);
		});

		test('aggregate metrics produce the same average regardless of concurrency', async () => {
			setupHappyPathMocks(5);
			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 1);
			const sequentialMetrics = testRunRepository.markAsCompleted.mock.calls[0][1];

			// `clearAllMocks` resets call history but not implementations. The
			// `createTestRun` stub is set in the outer `beforeEach`, so it needs
			// re-stubbing here. `setupHappyPathMocks` re-wires everything else.
			jest.clearAllMocks();
			testRunRepository.createTestRun.mockResolvedValue(mock<TestRun>({ id: 'test-run-id' }));
			setupHappyPathMocks(5);
			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 4);
			const parallelMetrics = testRunRepository.markAsCompleted.mock.calls[0][1];

			expect(Object.keys(parallelMetrics ?? {}).sort()).toEqual(
				Object.keys(sequentialMetrics ?? {}).sort(),
			);
			for (const key of Object.keys(sequentialMetrics ?? {})) {
				expect((parallelMetrics as Record<string, number>)[key]).toBeCloseTo(
					(sequentialMetrics as Record<string, number>)[key],
					15,
				);
			}
		});

		test('per-case error does not stop other cases from completing', async () => {
			setupHappyPathMocks(4);

			// Override per-case mock so case 2 throws.
			activeExecutions.getPostExecutePromise.mockImplementation(async (executionId) => {
				if (executionId === 'dataset-exec') {
					return buildDatasetExecution(4);
				}
				if (executionId === 'case-exec-2') {
					throw new Error('synthetic failure');
				}
				return buildCaseExecution(0.5);
			});

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 2);

			// 4 test-case executions attempted; 1 errored, 3 succeeded.
			const createCalls = testCaseExecutionRepository.createTestCaseExecution.mock.calls;
			const errorRows = createCalls.filter(([row]) => row.status === 'error');
			const successRows = createCalls.filter(([row]) => row.status === 'success');
			expect(errorRows).toHaveLength(1);
			expect(successRows).toHaveLength(3);
			expect(testRunRepository.markAsCompleted).toHaveBeenCalledTimes(1);
		});

		test('throttle is called once per case and release is called once per case', async () => {
			setupHappyPathMocks(4);

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 2);

			expect(concurrencyControlService.throttle).toHaveBeenCalledTimes(4);
			expect(concurrencyControlService.release).toHaveBeenCalledTimes(4);
			expect(concurrencyControlService.throttle).toHaveBeenCalledWith({
				mode: 'evaluation',
				executionId: expect.stringContaining('test-run-id-case-'),
			});
			expect(concurrencyControlService.release).toHaveBeenCalledWith({ mode: 'evaluation' });
		});

		test('release is called even when runTestCase throws', async () => {
			// `setupHappyPathMocks` wires the dataset-trigger execution; the
			// override below replaces only the per-case execution path so each
			// case throws. The `dataset-exec` branch is preserved manually here
			// to keep the dataset trigger intact.
			setupHappyPathMocks(3);

			activeExecutions.getPostExecutePromise.mockImplementation(async (executionId) => {
				if (executionId === 'dataset-exec') {
					return {
						data: {
							resultData: {
								runData: {
									[TRIGGER_NODE_NAME]: [
										{
											data: {
												[NodeConnectionTypes.Main]: [
													[{ json: { id: 0 } }, { json: { id: 1 } }, { json: { id: 2 } }],
												],
											},
										},
									],
								},
							},
						},
					} as unknown as IRun;
				}
				throw new Error('synthetic per-case failure');
			});

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 2);

			expect(concurrencyControlService.throttle).toHaveBeenCalledTimes(3);
			// release fires in the finally block — must run even though every
			// case threw.
			expect(concurrencyControlService.release).toHaveBeenCalledTimes(3);
		});

		test('telemetry payload includes concurrency, parallel_enabled, concurrency_limited_by_config, flag_enabled_for_user', async () => {
			setupHappyPathMocks(2);

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 4, true);

			const trackCalls = telemetry.track.mock.calls.filter(
				([eventName]) => eventName === 'Test run finished',
			);
			expect(trackCalls).toHaveLength(1);
			const payload = trackCalls[0][1] as Record<string, unknown>;
			expect(payload).toEqual(
				expect.objectContaining({
					concurrency: 4,
					parallel_enabled: true,
					concurrency_limited_by_config: false,
					flag_enabled_for_user: true,
				}),
			);
		});

		test('flag_enabled_for_user defaults to false when not passed', async () => {
			setupHappyPathMocks(2);

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 1);

			const payload = telemetry.track.mock.calls.find(
				([eventName]) => eventName === 'Test run finished',
			)?.[1] as Record<string, unknown>;
			expect(payload.flag_enabled_for_user).toBe(false);
		});

		test('telemetry parallel_enabled is false for sequential runs', async () => {
			setupHappyPathMocks(2);

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 1);

			const trackCalls = telemetry.track.mock.calls.filter(
				([eventName]) => eventName === 'Test run finished',
			);
			expect(trackCalls).toHaveLength(1);
			const payload = trackCalls[0][1] as Record<string, unknown>;
			expect(payload).toEqual(
				expect.objectContaining({
					concurrency: 1,
					parallel_enabled: false,
					concurrency_limited_by_config: false,
				}),
			);
		});

		test('telemetry payload reports realised fan-out (cases_started, peak_in_flight)', async () => {
			const { inFlightTracker } = setupHappyPathMocks(6);

			await testRunnerService.runTest(USER as never, WORKFLOW_ID, 3, true);

			const payload = telemetry.track.mock.calls.find(
				([eventName]) => eventName === 'Test run finished',
			)?.[1] as Record<string, unknown>;
			expect(payload.cases_started).toBe(6);
			// Should match what the test harness independently observed —
			// proves the telemetry stat is the same number a watcher would see.
			expect(payload.peak_in_flight).toBe(inFlightTracker.max);
			expect(payload.peak_in_flight).toBeGreaterThan(1);
			expect(payload.peak_in_flight).toBeLessThanOrEqual(3);
		});

		test('evaluationLimit clamps requested concurrency and flags concurrency_limited_by_config', async () => {
			const cappedConfig = mockInstance(ExecutionsConfig, {
				mode: 'regular',
				concurrency: { productionLimit: -1, evaluationLimit: 2 } as never,
			});
			const cappedService = new TestRunnerService(
				logger,
				telemetry,
				workflowRepository,
				workflowRunner,
				activeExecutions,
				testRunRepository,
				testCaseExecutionRepository,
				errorReporter,
				cappedConfig,
				mock(),
				publisher,
				instanceSettings,
				concurrencyControlService,
			);

			const { inFlightTracker } = setupHappyPathMocks(6);

			await cappedService.runTest(USER as never, WORKFLOW_ID, 5);

			expect(inFlightTracker.max).toBeLessThanOrEqual(2);
			const payload = telemetry.track.mock.calls.find(
				([eventName]) => eventName === 'Test run finished',
			)?.[1] as Record<string, unknown>;
			expect(payload).toEqual(
				expect.objectContaining({
					concurrency: 2,
					parallel_enabled: true,
					concurrency_limited_by_config: true,
				}),
			);
		});

		test('abort during throttle wait evicts the queue entry and short-circuits without an UNKNOWN_ERROR row', async () => {
			setupHappyPathMocks(3);

			// Hold throttle indefinitely so all per-case tasks are stuck in the
			// queue when we fire the abort.
			concurrencyControlService.throttle.mockImplementation(
				async () =>
					await new Promise<void>(() => {
						/* never resolves */
					}),
			);

			// Kick off the run, then abort while cases are queued in throttle.
			const runPromise = testRunnerService.runTest(USER as never, WORKFLOW_ID, 3);
			await new Promise((resolve) => setTimeout(resolve, 5));

			// Reach into the service's abort controllers map and trip it.
			// `cancelTestRunLocally` is the path the public cancel API takes.
			const cancelled = (
				testRunnerService as never as {
					cancelTestRunLocally: (id: string) => boolean;
				}
			).cancelTestRunLocally('test-run-id');
			expect(cancelled).toBe(true);

			await runPromise;

			// Each queued case should have been evicted via remove().
			expect(concurrencyControlService.remove).toHaveBeenCalledWith({
				mode: 'evaluation',
				executionId: expect.stringContaining('test-run-id-case-'),
			});

			// And no test-case row should have been updated to an error state
			// for the evicted cases — they short-circuit before touching the
			// DB. The legacy path would have produced UNKNOWN_ERROR rows here.
			const errorRows = testCaseExecutionRepository.createTestCaseExecution.mock.calls.filter(
				([row]) => row.errorCode === 'UNKNOWN_ERROR',
			);
			expect(errorRows).toHaveLength(0);

			// Run is marked cancelled, not completed.
			expect(testRunRepository.markAsCancelled).toHaveBeenCalled();
			expect(testRunRepository.markAsCompleted).not.toHaveBeenCalled();
		});

		test('multi-main DB cancel flag flipped mid-run aborts the controller', async () => {
			const multiMainInstance = mock<InstanceSettings>({
				hostId: 'main-a',
				isMultiMain: true,
			});
			const multiMainService = new TestRunnerService(
				logger,
				telemetry,
				workflowRepository,
				workflowRunner,
				activeExecutions,
				testRunRepository,
				testCaseExecutionRepository,
				errorReporter,
				executionsConfig,
				mock(),
				publisher,
				multiMainInstance,
				concurrencyControlService,
			);

			setupHappyPathMocks(4);

			// Flip the cancellation flag after the first case sees it as false.
			let pollCount = 0;
			testRunRepository.isCancellationRequested.mockImplementation(async () => {
				pollCount++;
				return pollCount > 1;
			});

			await multiMainService.runTest(USER as never, WORKFLOW_ID, 1);

			expect(testRunRepository.isCancellationRequested).toHaveBeenCalled();
			expect(testRunRepository.markAsCancelled).toHaveBeenCalled();
			expect(testRunRepository.markAsCompleted).not.toHaveBeenCalled();
		});
	});
});

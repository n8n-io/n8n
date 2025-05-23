import type { TestRun } from '@n8n/db';
import type { TestCaseExecutionRepository } from '@n8n/db';
import type { TestRunRepository } from '@n8n/db';
import type { WorkflowRepository } from '@n8n/db';
import { readFileSync } from 'fs';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import type { IRun } from 'n8n-workflow';
import path from 'path';

import type { ActiveExecutions } from '@/active-executions';
import { EVALUATION_DATASET_TRIGGER_NODE } from '@/constants';
import { TestRunError } from '@/evaluation.ee/test-runner/errors.ee';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import { mockInstance, mockLogger } from '@test/mocking';
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

	describe('findTriggerNode', () => {
		test('should find the trigger node in a workflow', () => {
			// Setup a test workflow with a trigger node
			const workflowWithTrigger = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: 'Dataset Trigger',
						type: EVALUATION_DATASET_TRIGGER_NODE,
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
			const result = (testRunnerService as any).findTriggerNode(workflowWithTrigger);

			// Assert the result is the correct node
			expect(result).toBeDefined();
			expect(result.type).toBe(EVALUATION_DATASET_TRIGGER_NODE);
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
			const result = (testRunnerService as any).findTriggerNode(workflowWithoutTrigger);
			expect(result).toBeUndefined();
		});

		test('should work with the actual workflow.under-test.json', () => {
			const result = (testRunnerService as any).findTriggerNode(wfUnderTestJson);

			// Assert the result is the correct node
			expect(result).toBeDefined();
			expect(result.type).toBe(EVALUATION_DATASET_TRIGGER_NODE);
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
						type: EVALUATION_DATASET_TRIGGER_NODE,
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
						type: EVALUATION_DATASET_TRIGGER_NODE,
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

		test('should throw an error if trigger node output is empty list', () => {
			// Create workflow with a trigger node
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: EVALUATION_DATASET_TRIGGER_NODE,
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
						type: EVALUATION_DATASET_TRIGGER_NODE,
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

		test('should call workflowRunner.run with correct data', async () => {
			// Create workflow with a trigger node
			const triggerNodeName = 'Dataset Trigger';
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: EVALUATION_DATASET_TRIGGER_NODE,
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

			// Verify node execution stack contains the requestDataset flag
			expect(runCallArg).toHaveProperty('executionData.executionData.nodeExecutionStack');
			const nodeExecutionStack = runCallArg.executionData?.executionData?.nodeExecutionStack;
			expect(nodeExecutionStack).toBeInstanceOf(Array);
			expect(nodeExecutionStack).toHaveLength(1);
			expect(nodeExecutionStack?.[0]).toHaveProperty('node.name', triggerNodeName);
			expect(nodeExecutionStack?.[0]).toHaveProperty('data.main[0][0].json.requestDataset', true);
		});

		test('should wait for execution to finish and return result', async () => {
			// Create workflow with a trigger node
			const triggerNodeName = 'Dataset Trigger';
			const workflow = mock<IWorkflowBase>({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: EVALUATION_DATASET_TRIGGER_NODE,
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
						type: EVALUATION_DATASET_TRIGGER_NODE,
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
					workflowData: workflow,
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
						type: EVALUATION_DATASET_TRIGGER_NODE,
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
	});
});

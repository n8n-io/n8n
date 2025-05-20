import type { TestRun } from '@n8n/db';
import type { TestCaseExecutionRepository } from '@n8n/db';
import type { TestRunRepository } from '@n8n/db';
import type { WorkflowRepository } from '@n8n/db';
import { readFileSync } from 'fs';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { ITaskData, IWorkflowBase } from 'n8n-workflow';
import type { ExecutionError, IRun } from 'n8n-workflow';
import path from 'path';

import type { ActiveExecutions } from '@/active-executions';
import { EVALUATION_DATASET_TRIGGER_NODE } from '@/constants';
import { TestCaseExecutionError, TestRunError } from '@/evaluation.ee/test-runner/errors.ee';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import { mockInstance, mockLogger } from '@test/mocking';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

import { TestRunnerService } from '../test-runner.service.ee';

const wfUnderTestJson = JSON.parse(
	readFileSync(path.join(__dirname, './mock-data/workflow.under-test.json'), { encoding: 'utf-8' }),
);

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

const errorReporter = mock<ErrorReporter>();
const logger = mockLogger();
const telemetry = mock<Telemetry>();

describe('TestRunnerService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const testRunRepository = mock<TestRunRepository>();
	const testCaseExecutionRepository = mock<TestCaseExecutionRepository>();

	// const mockNodeTypes = mockInstance(NodeTypes);
	mockInstance(LoadNodesAndCredentials, {
		loadedNodes: mockNodeTypesData(['manualTrigger', 'set', 'if', 'code', 'evaluation']),
	});

	beforeEach(() => {
		testRunRepository.createTestRun.mockResolvedValue(mock<TestRun>({ id: 'test-run-id' }));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	test('should create an instance of TestRunnerService', async () => {
		const testRunnerService = new TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			errorReporter,
		);

		expect(testRunnerService).toBeInstanceOf(TestRunnerService);
	});

	describe('findTriggerNode', () => {
		let testRunnerService: TestRunnerService;

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
		});

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
		let testRunnerService: TestRunnerService;

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
		});

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
});

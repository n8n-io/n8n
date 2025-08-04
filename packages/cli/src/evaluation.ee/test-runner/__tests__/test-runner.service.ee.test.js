'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const fs_1 = require('fs');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = __importDefault(require('path'));
const config_1 = __importDefault(require('@/config'));
const errors_ee_1 = require('@/evaluation.ee/test-runner/errors.ee');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const node_types_data_1 = require('@test-integration/utils/node-types-data');
const test_runner_service_ee_1 = require('../test-runner.service.ee');
const wfUnderTestJson = JSON.parse(
	(0, fs_1.readFileSync)(path_1.default.join(__dirname, './mock-data/workflow.under-test.json'), {
		encoding: 'utf-8',
	}),
);
const errorReporter = (0, jest_mock_extended_1.mock)();
const logger = (0, backend_test_utils_1.mockLogger)();
const telemetry = (0, jest_mock_extended_1.mock)();
describe('TestRunnerService', () => {
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const workflowRunner = (0, jest_mock_extended_1.mock)();
	const activeExecutions = (0, jest_mock_extended_1.mock)();
	const testRunRepository = (0, jest_mock_extended_1.mock)();
	const testCaseExecutionRepository = (0, jest_mock_extended_1.mock)();
	let testRunnerService;
	(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials, {
		loadedNodes: (0, node_types_data_1.mockNodeTypesData)([
			'manualTrigger',
			'set',
			'if',
			'code',
			'evaluation',
		]),
	});
	beforeEach(() => {
		testRunnerService = new test_runner_service_ee_1.TestRunnerService(
			logger,
			telemetry,
			workflowRepository,
			workflowRunner,
			activeExecutions,
			testRunRepository,
			testCaseExecutionRepository,
			errorReporter,
		);
		testRunRepository.createTestRun.mockResolvedValue(
			(0, jest_mock_extended_1.mock)({ id: 'test-run-id' }),
		);
	});
	afterEach(() => {
		jest.resetAllMocks();
	});
	describe('findEvaluationTriggerNode', () => {
		test('should find the trigger node in a workflow', () => {
			const workflowWithTrigger = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Dataset Trigger',
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
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
			const result = testRunnerService.findEvaluationTriggerNode(workflowWithTrigger);
			expect(result).toBeDefined();
			expect(result.type).toBe(n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE);
			expect(result.name).toBe('Dataset Trigger');
		});
		test('should return undefined when no trigger node is found', () => {
			const workflowWithoutTrigger = (0, jest_mock_extended_1.mock)({
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
			const result = testRunnerService.findEvaluationTriggerNode(workflowWithoutTrigger);
			expect(result).toBeUndefined();
		});
		test('should work with the actual workflow.under-test.json', () => {
			const result = testRunnerService.findEvaluationTriggerNode(wfUnderTestJson);
			expect(result).toBeDefined();
			expect(result.type).toBe(n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE);
			expect(result.name).toBe('When fetching a dataset row');
		});
	});
	describe('extractDatasetTriggerOutput', () => {
		test('should extract trigger output data from execution', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});
			const mockOutputItems = [
				{ json: { id: 1, name: 'Test 1' } },
				{ json: { id: 2, name: 'Test 2' } },
			];
			const execution = (0, jest_mock_extended_1.mock)({
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
			const result = testRunnerService.extractDatasetTriggerOutput(execution, workflow);
			expect(result).toEqual(mockOutputItems);
		});
		test('should throw an error if trigger node output is not present', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});
			const execution = (0, jest_mock_extended_1.mock)({
				data: {
					resultData: {
						runData: {},
					},
				},
			});
			expect(() => {
				testRunnerService.extractDatasetTriggerOutput(execution, workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.extractDatasetTriggerOutput(execution, workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('TEST_CASES_NOT_FOUND');
			}
		});
		test('should throw an error if evaluation trigger could not fetch data', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});
			const execution = (0, jest_mock_extended_1.mock)({
				data: {
					resultData: {
						runData: {
							TriggerNode: [
								{
									error: (0, jest_mock_extended_1.mock)(),
								},
							],
						},
					},
				},
			});
			expect(() => {
				testRunnerService.extractDatasetTriggerOutput(execution, workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.extractDatasetTriggerOutput(execution, workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('CANT_FETCH_TEST_CASES');
			}
		});
		test('should throw an error if trigger node output is empty list', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'triggerNodeId',
						name: 'TriggerNode',
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});
			const execution = (0, jest_mock_extended_1.mock)({
				data: {
					resultData: {
						runData: {
							TriggerNode: [
								{
									data: {
										main: [[]],
									},
									error: undefined,
								},
							],
						},
					},
				},
			});
			expect(() => {
				testRunnerService.extractDatasetTriggerOutput(execution, workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.extractDatasetTriggerOutput(execution, workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('TEST_CASES_NOT_FOUND');
			}
		});
		test('should work with actual execution data format', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'triggerNodeId',
						name: "When clicking 'Execute workflow'",
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			});
			const expectedItems = [
				{ json: { query: 'First item' }, pairedItem: { item: 0 } },
				{ json: { query: 'Second item' }, pairedItem: { item: 0 } },
				{ json: { query: 'Third item' }, pairedItem: { item: 0 } },
			];
			const execution = (0, jest_mock_extended_1.mock)({
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
			const result = testRunnerService.extractDatasetTriggerOutput(execution, workflow);
			expect(result).toEqual(expectedItems);
		});
	});
	describe('runDatasetTrigger', () => {
		beforeEach(() => {
			const mockExecutionId = 'mock-execution-id';
			const mockExecutionData = (0, jest_mock_extended_1.mock)({
				data: {
					resultData: {
						runData: {},
					},
				},
			});
			workflowRunner.run.mockResolvedValue(mockExecutionId);
			activeExecutions.getPostExecutePromise.mockResolvedValue(mockExecutionData);
		});
		test('should throw an error if trigger node is not found', async () => {
			const workflow = (0, jest_mock_extended_1.mock)({
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
			await expect(testRunnerService.runDatasetTrigger(workflow, metadata)).rejects.toThrow(
				errors_ee_1.TestRunError,
			);
			try {
				await testRunnerService.runDatasetTrigger(workflow, metadata);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('EVALUATION_TRIGGER_NOT_FOUND');
			}
		});
		test('should call workflowRunner.run with correct data in normal execution mode', async () => {
			const triggerNodeName = 'Dataset Trigger';
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
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
			await testRunnerService.runDatasetTrigger(workflow, metadata);
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			const runCallArg = workflowRunner.run.mock.calls[0][0];
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
			config_1.default.set('executions.mode', 'queue');
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';
			const triggerNodeName = 'Dataset Trigger';
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
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
			await testRunnerService.runDatasetTrigger(workflow, metadata);
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			const runCallArg = workflowRunner.run.mock.calls[0][0];
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
			config_1.default.set('executions.mode', 'regular');
			delete process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
		});
		test('should wait for execution to finish and return result', async () => {
			const triggerNodeName = 'Dataset Trigger';
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
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
			const mockExecutionId = 'dataset-execution-id';
			const mockExecutionResult = (0, jest_mock_extended_1.mock)({
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
			const result = await testRunnerService.runDatasetTrigger(workflow, metadata);
			expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith(mockExecutionId);
			expect(result).toEqual(mockExecutionResult);
		});
	});
	describe('runTestCase', () => {
		beforeEach(() => {
			const mockExecutionId = 'mock-execution-id';
			const mockExecutionData = (0, jest_mock_extended_1.mock)({
				data: {
					resultData: {
						runData: {},
					},
				},
			});
			workflowRunner.run.mockResolvedValue(mockExecutionId);
			activeExecutions.getPostExecutePromise.mockResolvedValue(mockExecutionData);
		});
		test('should return undefined if abortSignal is aborted', async () => {
			const abortController = new AbortController();
			abortController.abort();
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [],
				connections: {},
			});
			const metadata = {
				testRunId: 'test-run-id',
				userId: 'user-id',
			};
			const testCase = { json: { id: 1, name: 'Test 1' } };
			const result = await testRunnerService.runTestCase(
				workflow,
				metadata,
				testCase,
				abortController.signal,
			);
			expect(result).toBeUndefined();
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});
		test('should call workflowRunner.run with correct data', async () => {
			const triggerNodeName = 'TriggerNode';
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
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
			await testRunnerService.runTestCase(workflow, metadata, testCase, abortController.signal);
			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			const runCallArg = workflowRunner.run.mock.calls[0][0];
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
			const triggerNodeName = 'TriggerNode';
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: triggerNodeName,
						type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
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
			const mockAddEventListener = jest.fn();
			const originalAddEventListener = abortController.signal.addEventListener;
			abortController.signal.addEventListener = mockAddEventListener;
			try {
				const result = await testRunnerService.runTestCase(
					workflow,
					metadata,
					testCase,
					abortController.signal,
				);
				expect(mockAddEventListener).toHaveBeenCalledTimes(1);
				expect(mockAddEventListener.mock.calls[0][0]).toBe('abort');
				expect(result).toHaveProperty('executionData');
				expect(result.executionData?.data).toBeDefined();
				expect(result).toHaveProperty('executionId');
				expect(result.executionId).toEqual(expect.any(String));
			} finally {
				abortController.signal.addEventListener = originalAddEventListener;
			}
		});
		describe('runTestCase - Queue Mode', () => {
			beforeEach(() => {
				jest.spyOn(config_1.default, 'getEnv').mockImplementation((key) => {
					if (key === 'executions.mode') {
						return 'queue';
					}
					return undefined;
				});
			});
			afterEach(() => {
				config_1.default.getEnv.mockRestore();
			});
			test('should call workflowRunner.run with correct data in queue mode', async () => {
				const triggerNodeName = 'TriggerNode';
				const workflow = (0, jest_mock_extended_1.mock)({
					nodes: [
						{
							id: 'node1',
							name: triggerNodeName,
							type: n8n_workflow_1.EVALUATION_TRIGGER_NODE_TYPE,
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
				await testRunnerService.runTestCase(workflow, metadata, testCase, abortController.signal);
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
				const runCallArg = workflowRunner.run.mock.calls[0][0];
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
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetMetricsNodes(workflow);
			}).not.toThrow();
		});
		it('should throw SET_METRICS_NODE_NOT_FOUND when no metrics nodes exist', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
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
				testRunnerService.validateSetMetricsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_FOUND');
			}
		});
		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when metrics node has no parameters', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetMetricsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});
		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when metrics node has empty assignments', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetMetricsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});
		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when assignment has no name', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetMetricsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});
		it('should throw SET_METRICS_NODE_NOT_FOUND when metrics node is disabled', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetMetricsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_FOUND');
				expect(error.extra).toEqual({});
			}
		});
		it('should throw SET_METRICS_NODE_NOT_CONFIGURED when assignment has null value', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetMetricsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetMetricsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Metrics' });
			}
		});
		it('should validate multiple metrics nodes successfully', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Metrics 1',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetMetricsNodes(workflow);
			}).not.toThrow();
		});
		describe('Version-based validation', () => {
			it('should pass for version < 4.7 with valid custom metrics (no metric parameter needed)', () => {
				const workflow = (0, jest_mock_extended_1.mock)({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: n8n_workflow_1.EVALUATION_NODE_TYPE,
							typeVersion: 4.6,
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
				expect(() => {
					testRunnerService.validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});
			it('should fail for version < 4.7 with invalid custom metrics configuration', () => {
				const workflow = (0, jest_mock_extended_1.mock)({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: n8n_workflow_1.EVALUATION_NODE_TYPE,
							typeVersion: 4.6,
							position: [0, 0],
							parameters: {
								operation: 'setMetrics',
								metrics: {
									assignments: [],
								},
							},
						},
					],
					connections: {},
				});
				expect(() => {
					testRunnerService.validateSetMetricsNodes(workflow);
				}).toThrow(errors_ee_1.TestRunError);
				try {
					testRunnerService.validateSetMetricsNodes(workflow);
				} catch (error) {
					expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
					expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
					expect(error.extra).toEqual({ node_name: 'Set Metrics' });
				}
			});
			it('should fail for version >= 4.7 with missing metric parameter', () => {
				const workflow = (0, jest_mock_extended_1.mock)({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				workflow.nodes[0].parameters.metric = undefined;
				expect(() => {
					testRunnerService.validateSetMetricsNodes(workflow);
				}).toThrow(errors_ee_1.TestRunError);
				try {
					testRunnerService.validateSetMetricsNodes(workflow);
				} catch (error) {
					expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
					expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
					expect(error.extra).toEqual({ node_name: 'Set Metrics' });
				}
			});
			it('should pass for version >= 4.7 with valid customMetrics configuration', () => {
				const workflow = (0, jest_mock_extended_1.mock)({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
					testRunnerService.validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});
			it('should pass for version >= 4.7 with non-customMetrics metric (no metrics validation needed)', () => {
				const workflow = (0, jest_mock_extended_1.mock)({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
					testRunnerService.validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});
			it('should fail for version >= 4.7 with customMetrics but invalid metrics configuration', () => {
				const workflow = (0, jest_mock_extended_1.mock)({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics',
							type: n8n_workflow_1.EVALUATION_NODE_TYPE,
							typeVersion: 4.7,
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
					testRunnerService.validateSetMetricsNodes(workflow);
				}).toThrow(errors_ee_1.TestRunError);
				try {
					testRunnerService.validateSetMetricsNodes(workflow);
				} catch (error) {
					expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
					expect(error.code).toBe('SET_METRICS_NODE_NOT_CONFIGURED');
					expect(error.extra).toEqual({ node_name: 'Set Metrics' });
				}
			});
			it('should handle mixed versions correctly', () => {
				const workflow = (0, jest_mock_extended_1.mock)({
					nodes: [
						{
							id: 'node1',
							name: 'Set Metrics Old',
							type: n8n_workflow_1.EVALUATION_NODE_TYPE,
							typeVersion: 4.6,
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
						{
							id: 'node2',
							name: 'Set Metrics New',
							type: n8n_workflow_1.EVALUATION_NODE_TYPE,
							typeVersion: 4.7,
							position: [100, 0],
							parameters: {
								operation: 'setMetrics',
								metric: 'correctness',
							},
						},
					],
					connections: {},
				});
				expect(() => {
					testRunnerService.validateSetMetricsNodes(workflow);
				}).not.toThrow();
			});
		});
	});
	describe('validateSetOutputsNodes', () => {
		it('should pass when outputs nodes are properly configured', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetOutputsNodes(workflow);
			}).not.toThrow();
		});
		it('should pass when operation is default (undefined)', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetOutputsNodes(workflow);
			}).not.toThrow();
		});
		it('should throw SET_OUTPUTS_NODE_NOT_CONFIGURED when outputs node has no parameters', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetOutputsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetOutputsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_OUTPUTS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Outputs' });
			}
		});
		it('should throw SET_OUTPUTS_NODE_NOT_CONFIGURED when outputs node has empty assignments', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetOutputsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetOutputsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_OUTPUTS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Outputs' });
			}
		});
		it('should throw SET_OUTPUTS_NODE_NOT_CONFIGURED when assignment has no name', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetOutputsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetOutputsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_OUTPUTS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Outputs' });
			}
		});
		it('should throw SET_OUTPUTS_NODE_NOT_CONFIGURED when assignment has null value', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetOutputsNodes(workflow);
			}).toThrow(errors_ee_1.TestRunError);
			try {
				testRunnerService.validateSetOutputsNodes(workflow);
			} catch (error) {
				expect(error).toBeInstanceOf(errors_ee_1.TestRunError);
				expect(error.code).toBe('SET_OUTPUTS_NODE_NOT_CONFIGURED');
				expect(error.extra).toEqual({ node_name: 'Set Outputs' });
			}
		});
		it('should validate multiple outputs nodes successfully', () => {
			const workflow = (0, jest_mock_extended_1.mock)({
				nodes: [
					{
						id: 'node1',
						name: 'Set Outputs 1',
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
						type: n8n_workflow_1.EVALUATION_NODE_TYPE,
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
				testRunnerService.validateSetOutputsNodes(workflow);
			}).not.toThrow();
		});
	});
});
//# sourceMappingURL=test-runner.service.ee.test.js.map

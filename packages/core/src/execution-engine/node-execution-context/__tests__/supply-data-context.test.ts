import { mock } from 'jest-mock-extended';
import type {
	INode,
	IWorkflowExecuteAdditionalData,
	IRunExecutionData,
	INodeExecutionData,
	ITaskDataConnections,
	IExecuteData,
	Workflow,
	WorkflowExecuteMode,
	ICredentialsHelper,
	Expression,
	INodeType,
	INodeTypes,
	ICredentialDataDecryptedObject,
	NodeConnectionType,
	IRunData,
} from 'n8n-workflow';
import { ApplicationError, ManualExecutionCancelledError, NodeConnectionTypes } from 'n8n-workflow';

import { describeCommonTests } from './shared-tests';
import { SupplyDataContext } from '../supply-data-context';

describe('SupplyDataContext', () => {
	const testCredentialType = 'testCredential';
	const nodeType = mock<INodeType>({
		description: {
			credentials: [
				{
					name: testCredentialType,
					required: true,
				},
			],
			properties: [
				{
					name: 'testParameter',
					required: true,
				},
			],
		},
	});
	const nodeTypes = mock<INodeTypes>();
	const expression = mock<Expression>();
	const workflow = mock<Workflow>({ expression, nodeTypes });
	const node = mock<INode>({
		name: 'Test Node',
		credentials: {
			[testCredentialType]: {
				id: 'testCredentialId',
			},
		},
	});
	node.parameters = {
		testParameter: 'testValue',
	};
	const credentialsHelper = mock<ICredentialsHelper>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
	const mode: WorkflowExecuteMode = 'manual';
	const runExecutionData = mock<IRunExecutionData>({
		resultData: { runData: {} },
	});
	const connectionInputData: INodeExecutionData[] = [];
	const connectionType = NodeConnectionTypes.Main;
	const inputData: ITaskDataConnections = { [connectionType]: [[{ json: { test: 'data' } }]] };
	const executeData = mock<IExecuteData>();
	const runIndex = 0;
	const closeFn = jest.fn();
	const abortSignal = mock<AbortSignal>();

	const supplyDataContext = new SupplyDataContext(
		workflow,
		node,
		additionalData,
		mode,
		runExecutionData,
		runIndex,
		connectionInputData,
		inputData,
		connectionType,
		executeData,
		[closeFn],
		abortSignal,
	);

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		expression.getParameterValue.mockImplementation((value) => value);
	});

	describeCommonTests(supplyDataContext, {
		abortSignal,
		node,
		workflow,
		executeData,
		runExecutionData,
	});

	describe('getInputData', () => {
		const inputIndex = 0;

		afterEach(() => {
			inputData[connectionType] = [[{ json: { test: 'data' } }]];
		});

		it('should return the input data correctly', () => {
			const expectedData = [{ json: { test: 'data' } }];

			expect(supplyDataContext.getInputData(inputIndex, connectionType)).toEqual(expectedData);
		});

		it('should return an empty array if the input name does not exist', () => {
			const connectionType = 'nonExistent';
			expect(
				supplyDataContext.getInputData(inputIndex, connectionType as NodeConnectionType),
			).toEqual([]);
		});

		it('should throw an error if the input index is out of range', () => {
			const inputIndex = 2;

			expect(() => supplyDataContext.getInputData(inputIndex, connectionType)).toThrow(
				ApplicationError,
			);
		});

		it('should throw an error if the input index was not set', () => {
			inputData.main[inputIndex] = null;

			expect(() => supplyDataContext.getInputData(inputIndex, connectionType)).toThrow(
				ApplicationError,
			);
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should return parameter value when it exists', () => {
			const parameter = supplyDataContext.getNodeParameter('testParameter', 0);

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = supplyDataContext.getNodeParameter('otherParameter', 0, 'fallback');

			expect(parameter).toBe('fallback');
		});
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });

			const credentials = await supplyDataContext.getCredentials<ICredentialDataDecryptedObject>(
				testCredentialType,
				0,
			);

			expect(credentials).toEqual({ secret: 'token' });
		});
	});

	describe('getWorkflowDataProxy', () => {
		it('should return the workflow data proxy correctly', () => {
			const workflowDataProxy = supplyDataContext.getWorkflowDataProxy(0);
			expect(workflowDataProxy.isProxy).toBe(true);
			expect(Object.keys(workflowDataProxy.$input)).toEqual([
				'all',
				'context',
				'first',
				'item',
				'last',
				'params',
			]);
		});
	});

	describe('cloneWith', () => {
		it('should return a new copy', () => {
			const clone = supplyDataContext.cloneWith({ runIndex: 12, inputData: [[{ json: {} }]] });
			expect(clone.runIndex).toBe(12);
			expect(clone).not.toBe(supplyDataContext);
		});
	});

	describe('getNextRunIndex', () => {
		it('should return 0 as the default latest run index', () => {
			const latestRunIndex = supplyDataContext.getNextRunIndex();
			expect(latestRunIndex).toBe(0);
		});

		it('should return the length of the run execution data for the node', () => {
			const runData = mock<IRunData>();
			const runExecutionData = mock<IRunExecutionData>({
				resultData: { runData: { [node.name]: [runData, runData] } },
			});
			const supplyDataContext = new SupplyDataContext(
				workflow,
				node,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				connectionType,
				executeData,
				[closeFn],
				abortSignal,
			);

			const latestRunIndex = supplyDataContext.getNextRunIndex();

			expect(latestRunIndex).toBe(2);
		});
	});

	describe('logNodeOutput', () => {
		it('it should parse JSON', () => {
			const json = '{"key": "value", "nested": {"foo": "bar"}}';
			const expectedParsedObject = { key: 'value', nested: { foo: 'bar' } };
			const numberArg = 42;
			const stringArg = 'hello world!';

			const supplyDataContext = new SupplyDataContext(
				workflow,
				node,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				connectionType,
				executeData,
				[closeFn],
				abortSignal,
			);

			const sendMessageSpy = jest.spyOn(supplyDataContext, 'sendMessageToUI');

			supplyDataContext.logNodeOutput(json, numberArg, stringArg);

			expect(sendMessageSpy.mock.calls[0][0]).toEqual(expectedParsedObject);
			expect(sendMessageSpy.mock.calls[0][1]).toBe(numberArg);
			expect(sendMessageSpy.mock.calls[0][2]).toBe(stringArg);

			sendMessageSpy.mockRestore();
		});
	});

	describe('addExecutionDataFunctions', () => {
		it('should preserve canceled status when execution is aborted and output has error', async () => {
			const errorData = new ManualExecutionCancelledError('Execution was aborted');
			const abortedSignal = mock<AbortSignal>({ aborted: true });
			const mockHooks = {
				runHook: jest.fn().mockResolvedValue(undefined),
			};
			const testAdditionalData = mock<IWorkflowExecuteAdditionalData>({
				credentialsHelper,
				hooks: mockHooks,
				currentNodeExecutionIndex: 0,
			});
			const testRunExecutionData = mock<IRunExecutionData>({
				resultData: {
					runData: {
						[node.name]: [
							{
								executionStatus: 'canceled',
								startTime: Date.now(),
								executionTime: 0,
								executionIndex: 0,
								error: undefined,
							},
						],
					},
					error: undefined,
				},
				executionData: { metadata: {} },
			});

			const contextWithAbort = new SupplyDataContext(
				workflow,
				node,
				testAdditionalData,
				mode,
				testRunExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				'ai_agent',
				executeData,
				[closeFn],
				abortedSignal,
			);

			await contextWithAbort.addExecutionDataFunctions(
				'output',
				errorData,
				'ai_agent',
				node.name,
				0,
			);

			const taskData = testRunExecutionData.resultData.runData[node.name][0];
			expect(taskData.executionStatus).toBe('canceled');
			expect(taskData.error).toBeUndefined();

			// Verify nodeExecuteAfter hook was called correctly
			expect(mockHooks.runHook).toHaveBeenCalledWith('nodeExecuteAfter', [
				node.name,
				taskData,
				testRunExecutionData,
			]);
		});
	});

	describe('addExecutionHints', () => {
		it('should add single hint to context', () => {
			const testContext = new SupplyDataContext(
				workflow,
				node,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				connectionType,
				executeData,
				[closeFn],
				abortSignal,
			);

			const hint = {
				message: 'Test warning message',
				location: 'outputPane' as const,
			};

			testContext.addExecutionHints(hint);

			expect(testContext.hints).toHaveLength(1);
			expect(testContext.hints[0]).toEqual(hint);
		});

		it('should add multiple hints to context', () => {
			const testContext = new SupplyDataContext(
				workflow,
				node,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				connectionType,
				executeData,
				[closeFn],
				abortSignal,
			);

			const hint1 = {
				message: 'First hint',
				location: 'outputPane' as const,
			};
			const hint2 = {
				message: 'Second hint',
				location: 'inputPane' as const,
				type: 'warning' as const,
			};

			testContext.addExecutionHints(hint1, hint2);

			expect(testContext.hints).toHaveLength(2);
			expect(testContext.hints[0]).toEqual(hint1);
			expect(testContext.hints[1]).toEqual(hint2);
		});

		it('should accumulate hints across multiple calls', () => {
			const testContext = new SupplyDataContext(
				workflow,
				node,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				connectionType,
				executeData,
				[closeFn],
				abortSignal,
			);

			const hint1 = {
				message: 'First hint',
				location: 'outputPane' as const,
			};
			const hint2 = {
				message: 'Second hint',
				location: 'outputPane' as const,
			};

			testContext.addExecutionHints(hint1);
			testContext.addExecutionHints(hint2);

			expect(testContext.hints).toHaveLength(2);
			expect(testContext.hints[0]).toEqual(hint1);
			expect(testContext.hints[1]).toEqual(hint2);
		});

		it('should attach hints to task data when adding output', async () => {
			const mockHooks = {
				runHook: jest.fn().mockResolvedValue(undefined),
			};
			const testAdditionalData = mock<IWorkflowExecuteAdditionalData>({
				credentialsHelper,
				hooks: mockHooks,
				currentNodeExecutionIndex: 0,
			});
			const testRunExecutionData = mock<IRunExecutionData>({
				resultData: {
					runData: {
						[node.name]: [
							{
								startTime: Date.now(),
								executionTime: 0,
								executionIndex: 0,
								executionStatus: 'running' as const,
								source: [],
							},
						],
					},
					error: undefined,
				},
				executionData: { metadata: {} },
			});

			const testContext = new SupplyDataContext(
				workflow,
				node,
				testAdditionalData,
				mode,
				testRunExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				NodeConnectionTypes.AiTool,
				executeData,
				[closeFn],
				abortSignal,
			);

			const hint = {
				message: 'Value to match is null or undefined',
				location: 'outputPane' as const,
				type: 'warning' as const,
			};

			// Add hint to context
			testContext.addExecutionHints(hint);

			// Add output data which should trigger storing hints in task data
			await testContext.addExecutionDataFunctions(
				'output',
				[[{ json: { result: 'success' } }]],
				NodeConnectionTypes.AiTool,
				node.name,
				0,
			);

			// Verify hints were stored in task data
			const taskData = testRunExecutionData.resultData.runData[node.name][0];
			expect(taskData.hints).toBeDefined();
			expect(taskData.hints).toHaveLength(1);
			expect(taskData.hints![0]).toEqual(hint);
		});

		it('should not add hints property to task data if no hints exist', async () => {
			const mockHooks = {
				runHook: jest.fn().mockResolvedValue(undefined),
			};
			const testAdditionalData = mock<IWorkflowExecuteAdditionalData>({
				credentialsHelper,
				hooks: mockHooks,
				currentNodeExecutionIndex: 0,
			});

			// Create run execution data with plain object (not mock) to avoid mock functions
			const testRunExecutionData: IRunExecutionData = {
				resultData: {
					runData: {
						[node.name]: [
							{
								startTime: Date.now(),
								executionTime: 0,
								executionIndex: 0,
								executionStatus: 'running' as const,
								source: [],
							},
						],
					},
				},
				executionData: {
					metadata: {},
					contextData: {},
					nodeExecutionStack: [],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const testContext = new SupplyDataContext(
				workflow,
				node,
				testAdditionalData,
				mode,
				testRunExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				NodeConnectionTypes.AiTool,
				executeData,
				[closeFn],
				abortSignal,
			);

			// Don't add any hints

			// Add output data
			await testContext.addExecutionDataFunctions(
				'output',
				[[{ json: { result: 'success' } }]],
				NodeConnectionTypes.AiTool,
				node.name,
				0,
			);

			// Verify hints property was not added
			const taskData = testRunExecutionData.resultData.runData[node.name][0];
			expect(taskData.hints).toBeUndefined();
		});

		it('should handle hints when tool is used in AI workflow', async () => {
			// This test simulates the Google Sheets Update Row tool scenario
			const mockHooks = {
				runHook: jest.fn().mockResolvedValue(undefined),
			};
			const testAdditionalData = mock<IWorkflowExecuteAdditionalData>({
				credentialsHelper,
				hooks: mockHooks,
				currentNodeExecutionIndex: 0,
			});
			const testRunExecutionData = mock<IRunExecutionData>({
				resultData: {
					runData: {},
					error: undefined,
				},
				executionData: { metadata: {} },
			});

			const testContext = new SupplyDataContext(
				workflow,
				node,
				testAdditionalData,
				mode,
				testRunExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				NodeConnectionTypes.AiTool,
				executeData,
				[closeFn],
				abortSignal,
			);

			// Simulate input data being added
			testContext.addInputData(NodeConnectionTypes.AiTool, [[{ json: { query: 'test' } }]]);

			// Simulate the node adding a hint during execution (like Google Sheets does)
			const hint = {
				message: 'Warning: The value of column to match is null or undefined',
				location: 'outputPane' as const,
			};
			testContext.addExecutionHints(hint);

			// Add output data
			const outputData = [[{ json: { response: 'Row updated' } }]];
			await testContext.addExecutionDataFunctions(
				'output',
				outputData,
				NodeConnectionTypes.AiTool,
				node.name,
				0,
			);

			// Verify the hint is stored in task data and accessible
			const taskData = testRunExecutionData.resultData.runData[node.name][0];
			expect(taskData.hints).toBeDefined();
			expect(taskData.hints).toHaveLength(1);
			expect(taskData.hints![0].message).toContain('null or undefined');
			expect(taskData.hints![0].location).toBe('outputPane');
		});
	});
});

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
} from 'n8n-workflow';
import { ApplicationError, ExpressionError, NodeConnectionTypes } from 'n8n-workflow';

import type { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';

import { describeCommonTests } from './shared-tests';
import { ExecuteContext } from '../execute-context';
import * as validateUtil from '../utils/validate-value-against-schema';

describe('ExecuteContext', () => {
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
	const node: INode = {
		id: 'test-node-id',
		name: 'Test Node',
		type: 'testNodeType',
		typeVersion: 1,
		position: [0, 0],
		credentials: {
			[testCredentialType]: {
				id: 'testCredentialId',
				name: 'testCredential',
			},
		},
		parameters: {},
	};
	node.parameters = {
		testParameter: 'testValue',
		nullParameter: null,
	};
	const credentialsHelper = mock<ICredentialsHelper>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
	const mode: WorkflowExecuteMode = 'manual';
	const runExecutionData = mock<IRunExecutionData>();
	const connectionInputData: INodeExecutionData[] = [];
	const inputData: ITaskDataConnections = { main: [[{ json: { test: 'data' } }]] };
	const executeData = mock<IExecuteData>();
	const runIndex = 0;
	const closeFn = jest.fn();
	const abortSignal = mock<AbortSignal>();

	const executeContext = new ExecuteContext(
		workflow,
		node,
		additionalData,
		mode,
		runExecutionData,
		runIndex,
		connectionInputData,
		inputData,
		executeData,
		[closeFn],
		abortSignal,
	);

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		expression.getParameterValue.mockImplementation((value) => value);
	});

	describeCommonTests(executeContext, {
		abortSignal,
		node,
		workflow,
		executeData,
		runExecutionData,
	});

	describe('getInputData', () => {
		const inputIndex = 0;
		const connectionType = NodeConnectionTypes.Main;

		afterEach(() => {
			inputData[connectionType] = [[{ json: { test: 'data' } }]];
		});

		it('should return the input data correctly', () => {
			const expectedData = [{ json: { test: 'data' } }];

			expect(executeContext.getInputData(inputIndex, connectionType)).toEqual(expectedData);
		});

		it('should return an empty array if the input name does not exist', () => {
			const connectionType = 'nonExistent' as typeof NodeConnectionTypes.Main;
			expect(executeContext.getInputData(inputIndex, connectionType)).toEqual([]);
		});

		it('should throw an error if the input index is out of range', () => {
			const inputIndex = 2;

			expect(() => executeContext.getInputData(inputIndex, connectionType)).toThrow(
				ApplicationError,
			);
		});

		it('should throw an error if the input index was not set', () => {
			inputData.main[inputIndex] = null;

			expect(() => executeContext.getInputData(inputIndex, connectionType)).toThrow(
				ApplicationError,
			);
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should throw if parameter is not defined on the node.parameters', () => {
			expect(() => executeContext.getNodeParameter('invalidParameter', 0)).toThrow(
				'Could not get parameter',
			);
		});

		it('should return null if the parameter exists but has a null value', () => {
			const parameter = executeContext.getNodeParameter('nullParameter', 0);

			expect(parameter).toBeNull();
		});

		it('should return parameter value when it exists', () => {
			const parameter = executeContext.getNodeParameter('testParameter', 0);

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = executeContext.getNodeParameter('otherParameter', 0, 'fallback');

			expect(parameter).toBe('fallback');
		});

		it('should handle expression evaluation errors', () => {
			const error = new ExpressionError('Invalid expression');
			expression.getParameterValue.mockImplementationOnce(() => {
				throw error;
			});

			expect(() => executeContext.getNodeParameter('testParameter', 0)).toThrow(error);
			expect(error.context.parameter).toEqual('testParameter');
		});

		it('should handle expression errors on Set nodes (Ticket #PAY-684)', () => {
			node.type = 'n8n-nodes-base.set';
			node.continueOnFail = true;

			expression.getParameterValue.mockImplementationOnce(() => {
				throw new ExpressionError('Invalid expression');
			});

			const parameter = executeContext.getNodeParameter('testParameter', 0);
			expect(parameter).toEqual([{ name: undefined, value: undefined }]);
		});

		it('should not validate parameter if skipValidation in options', () => {
			const validateSpy = jest.spyOn(validateUtil, 'validateValueAgainstSchema');

			executeContext.getNodeParameter('testParameter', 0, '', {
				skipValidation: true,
			});

			expect(validateSpy).not.toHaveBeenCalled();

			validateSpy.mockRestore();
		});
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });

			const credentials = await executeContext.getCredentials<ICredentialDataDecryptedObject>(
				testCredentialType,
				0,
			);

			expect(credentials).toEqual({ secret: 'token' });
		});
	});

	describe('getExecuteData', () => {
		it('should return the execute data correctly', () => {
			expect(executeContext.getExecuteData()).toEqual(executeData);
		});
	});

	describe('getWorkflowDataProxy', () => {
		it('should return the workflow data proxy correctly', () => {
			const workflowDataProxy = executeContext.getWorkflowDataProxy(0);
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

	describe('logNodeOutput', () => {
		it('when in manual mode, should parse JSON', () => {
			const json = '{"key": "value", "nested": {"foo": "bar"}}';
			const expectedParsedObject = { key: 'value', nested: { foo: 'bar' } };
			const numberArg = 42;
			const stringArg = 'hello world!';

			const manualModeContext = new ExecuteContext(
				workflow,
				node,
				additionalData,
				'manual',
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				executeData,
				[closeFn],
				abortSignal,
			);

			const sendMessageSpy = jest.spyOn(manualModeContext, 'sendMessageToUI');

			manualModeContext.logNodeOutput(json, numberArg, stringArg);

			expect(sendMessageSpy.mock.calls[0][0]).toEqual(expectedParsedObject);
			expect(sendMessageSpy.mock.calls[0][1]).toBe(numberArg);
			expect(sendMessageSpy.mock.calls[0][2]).toBe(stringArg);

			sendMessageSpy.mockRestore();
		});
	});

	describe('sendChunk', () => {
		test('should send call hook with structured chunk', async () => {
			const hooksMock: ExecutionLifecycleHooks = mock<ExecutionLifecycleHooks>({
				runHook: jest.fn(),
			});
			const additionalDataWithHooks: IWorkflowExecuteAdditionalData = {
				...additionalData,
				hooks: hooksMock,
			};

			const testExecuteContext = new ExecuteContext(
				workflow,
				node,
				additionalDataWithHooks,
				'manual',
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				executeData,
				[closeFn],
				abortSignal,
			);

			await testExecuteContext.sendChunk('item', 0, 'test');

			expect(hooksMock.runHook).toHaveBeenCalledWith('sendChunk', [
				expect.objectContaining({
					type: 'item',
					content: 'test',
					metadata: expect.objectContaining({
						nodeName: 'Test Node',
						nodeId: 'test-node-id',
						runIndex: 0,
						itemIndex: 0,
						timestamp: expect.any(Number),
					}),
				}),
			]);
		});

		test('should send chunk without content when content is undefined', async () => {
			const hooksMock: ExecutionLifecycleHooks = mock<ExecutionLifecycleHooks>({
				runHook: jest.fn(),
			});
			const additionalDataWithHooks: IWorkflowExecuteAdditionalData = {
				...additionalData,
				hooks: hooksMock,
			};

			const testExecuteContext = new ExecuteContext(
				workflow,
				node,
				additionalDataWithHooks,
				'manual',
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				executeData,
				[closeFn],
				abortSignal,
			);

			await testExecuteContext.sendChunk('begin', 0);

			expect(hooksMock.runHook).toHaveBeenCalledWith('sendChunk', [
				expect.objectContaining({
					type: 'begin',
					content: undefined,
					metadata: expect.objectContaining({
						nodeName: 'Test Node',
						nodeId: 'test-node-id',
						runIndex: 0,
						itemIndex: 0,
						timestamp: expect.any(Number),
					}),
				}),
			]);
		});

		test('should handle when hooks is undefined', async () => {
			const additionalDataWithoutHooks = {
				...additionalData,
				hooks: undefined,
			};

			const testExecuteContext = new ExecuteContext(
				workflow,
				node,
				additionalDataWithoutHooks,
				'manual',
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				executeData,
				[closeFn],
				abortSignal,
			);

			// Should not throw error
			await expect(testExecuteContext.sendChunk('item', 0, 'test')).resolves.toBeUndefined();
		});
	});
});

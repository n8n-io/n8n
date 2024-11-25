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
	OnError,
	ContextType,
	IContextObject,
	ICredentialDataDecryptedObject,
	ISourceData,
	ITaskMetadata,
} from 'n8n-workflow';
import { ApplicationError, ExpressionError, NodeHelpers } from 'n8n-workflow';

import { ExecuteContext } from '../execute-context';

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
	const node = mock<INode>({
		credentials: {
			[testCredentialType]: {
				id: 'testCredentialId',
			},
		},
	});
	node.parameters = {
		testParameter: 'testValue',
		nullParameter: null,
	};
	const credentialsHelper = mock<ICredentialsHelper>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
	const mode: WorkflowExecuteMode = 'manual';
	const runExecutionData = mock<IRunExecutionData>();
	const connectionInputData = mock<INodeExecutionData[]>();
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

	describe('getExecutionCancelSignal', () => {
		it('should return the abort signal', () => {
			expect(executeContext.getExecutionCancelSignal()).toBe(abortSignal);
		});
	});

	describe('continueOnFail', () => {
		afterEach(() => {
			node.onError = undefined;
			node.continueOnFail = false;
		});

		it('should return false for nodes by default', () => {
			expect(executeContext.continueOnFail()).toEqual(false);
		});

		it('should return true if node has continueOnFail set to true', () => {
			node.continueOnFail = true;
			expect(executeContext.continueOnFail()).toEqual(true);
		});

		test.each([
			['continueRegularOutput', true],
			['continueErrorOutput', true],
			['stopWorkflow', false],
		])('if node has onError set to %s, it should return %s', (onError, expected) => {
			node.onError = onError as OnError;
			expect(executeContext.continueOnFail()).toEqual(expected);
		});
	});

	describe('evaluateExpression', () => {
		it('should evaluate the expression correctly', () => {
			const expression = '$json.test';
			const expectedResult = 'data';
			const resolveSimpleParameterValueSpy = jest.spyOn(
				workflow.expression,
				'resolveSimpleParameterValue',
			);
			resolveSimpleParameterValueSpy.mockReturnValue(expectedResult);

			expect(executeContext.evaluateExpression(expression)).toEqual(expectedResult);

			expect(resolveSimpleParameterValueSpy).toHaveBeenCalledWith(
				`=${expression}`,
				{},
				runExecutionData,
				runIndex,
				0,
				node.name,
				connectionInputData,
				mode,
				expect.objectContaining({}),
				executeData,
			);

			resolveSimpleParameterValueSpy.mockRestore();
		});
	});

	describe('getContext', () => {
		it('should return the context object', () => {
			const contextType: ContextType = 'node';
			const expectedContext = mock<IContextObject>();
			const getContextSpy = jest.spyOn(NodeHelpers, 'getContext');
			getContextSpy.mockReturnValue(expectedContext);

			expect(executeContext.getContext(contextType)).toEqual(expectedContext);

			expect(getContextSpy).toHaveBeenCalledWith(runExecutionData, contextType, node);

			getContextSpy.mockRestore();
		});
	});

	describe('getInputData', () => {
		const inputIndex = 0;
		const inputName = 'main';

		afterEach(() => {
			inputData[inputName] = [[{ json: { test: 'data' } }]];
		});

		it('should return the input data correctly', () => {
			const expectedData = [{ json: { test: 'data' } }];

			expect(executeContext.getInputData(inputIndex, inputName)).toEqual(expectedData);
		});

		it('should return an empty array if the input name does not exist', () => {
			const inputName = 'nonExistent';
			expect(executeContext.getInputData(inputIndex, inputName)).toEqual([]);
		});

		it('should throw an error if the input index is out of range', () => {
			const inputIndex = 2;

			expect(() => executeContext.getInputData(inputIndex, inputName)).toThrow(ApplicationError);
		});

		it('should throw an error if the input index was not set', () => {
			inputData.main[inputIndex] = null;

			expect(() => executeContext.getInputData(inputIndex, inputName)).toThrow(ApplicationError);
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

	describe('getInputSourceData', () => {
		it('should return the input source data correctly', () => {
			const inputSourceData = mock<ISourceData>();
			executeData.source = { main: [inputSourceData] };

			expect(executeContext.getInputSourceData()).toEqual(inputSourceData);
		});

		it('should throw an error if the source data is missing', () => {
			executeData.source = null;

			expect(() => executeContext.getInputSourceData()).toThrow(ApplicationError);
		});
	});

	describe('logAiEvent', () => {
		it('should log the AI event correctly', () => {
			const eventName = 'ai-tool-called';
			const msg = 'test message';

			executeContext.logAiEvent(eventName, msg);

			expect(additionalData.logAiEvent).toHaveBeenCalledWith(eventName, {
				executionId: additionalData.executionId,
				nodeName: node.name,
				workflowName: workflow.name,
				nodeType: node.type,
				workflowId: workflow.id,
				msg,
			});
		});
	});

	describe('setMetadata', () => {
		it('sets metadata on execution data', () => {
			const metadata: ITaskMetadata = {
				subExecution: {
					workflowId: '123',
					executionId: 'xyz',
				},
			};

			expect(executeContext.getExecuteData().metadata?.subExecution).toEqual(undefined);
			executeContext.setMetadata(metadata);
			expect(executeContext.getExecuteData().metadata?.subExecution).toEqual(metadata.subExecution);
		});
	});
});

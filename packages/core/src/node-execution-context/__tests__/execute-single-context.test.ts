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
import { ApplicationError, NodeHelpers } from 'n8n-workflow';

import { ExecuteSingleContext } from '../execute-single-context';

describe('ExecuteSingleContext', () => {
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
	};
	const credentialsHelper = mock<ICredentialsHelper>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
	const mode: WorkflowExecuteMode = 'manual';
	const runExecutionData = mock<IRunExecutionData>();
	const connectionInputData = mock<INodeExecutionData[]>();
	const inputData: ITaskDataConnections = { main: [[{ json: { test: 'data' } }]] };
	const executeData = mock<IExecuteData>();
	const runIndex = 0;
	const itemIndex = 0;
	const abortSignal = mock<AbortSignal>();

	const executeSingleContext = new ExecuteSingleContext(
		workflow,
		node,
		additionalData,
		mode,
		runExecutionData,
		runIndex,
		connectionInputData,
		inputData,
		itemIndex,
		executeData,
		abortSignal,
	);

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		expression.getParameterValue.mockImplementation((value) => value);
	});

	describe('getExecutionCancelSignal', () => {
		it('should return the abort signal', () => {
			expect(executeSingleContext.getExecutionCancelSignal()).toBe(abortSignal);
		});
	});

	describe('continueOnFail', () => {
		afterEach(() => {
			node.onError = undefined;
			node.continueOnFail = false;
		});

		it('should return false for nodes by default', () => {
			expect(executeSingleContext.continueOnFail()).toEqual(false);
		});

		it('should return true if node has continueOnFail set to true', () => {
			node.continueOnFail = true;
			expect(executeSingleContext.continueOnFail()).toEqual(true);
		});

		test.each([
			['continueRegularOutput', true],
			['continueErrorOutput', true],
			['stopWorkflow', false],
		])('if node has onError set to %s, it should return %s', (onError, expected) => {
			node.onError = onError as OnError;
			expect(executeSingleContext.continueOnFail()).toEqual(expected);
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

			expect(executeSingleContext.evaluateExpression(expression, itemIndex)).toEqual(
				expectedResult,
			);

			expect(resolveSimpleParameterValueSpy).toHaveBeenCalledWith(
				`=${expression}`,
				{},
				runExecutionData,
				runIndex,
				itemIndex,
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

			expect(executeSingleContext.getContext(contextType)).toEqual(expectedContext);

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
			const expectedData = { json: { test: 'data' } };

			expect(executeSingleContext.getInputData(inputIndex, inputName)).toEqual(expectedData);
		});

		it('should return an empty object if the input name does not exist', () => {
			const inputName = 'nonExistent';
			const expectedData = { json: {} };

			expect(executeSingleContext.getInputData(inputIndex, inputName)).toEqual(expectedData);
		});

		it('should throw an error if the input index is out of range', () => {
			const inputIndex = 1;

			expect(() => executeSingleContext.getInputData(inputIndex, inputName)).toThrow(
				ApplicationError,
			);
		});

		it('should throw an error if the input index was not set', () => {
			inputData.main[inputIndex] = null;

			expect(() => executeSingleContext.getInputData(inputIndex, inputName)).toThrow(
				ApplicationError,
			);
		});

		it('should throw an error if the value of input with given index was not set', () => {
			delete inputData.main[inputIndex]![itemIndex];

			expect(() => executeSingleContext.getInputData(inputIndex, inputName)).toThrow(
				ApplicationError,
			);
		});
	});

	describe('getItemIndex', () => {
		it('should return the item index correctly', () => {
			expect(executeSingleContext.getItemIndex()).toEqual(itemIndex);
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should return parameter value when it exists', () => {
			const parameter = executeSingleContext.getNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = executeSingleContext.getNodeParameter('otherParameter', 'fallback');

			expect(parameter).toBe('fallback');
		});
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });

			const credentials =
				await executeSingleContext.getCredentials<ICredentialDataDecryptedObject>(
					testCredentialType,
				);

			expect(credentials).toEqual({ secret: 'token' });
		});
	});

	describe('getExecuteData', () => {
		it('should return the execute data correctly', () => {
			expect(executeSingleContext.getExecuteData()).toEqual(executeData);
		});
	});

	describe('getWorkflowDataProxy', () => {
		it('should return the workflow data proxy correctly', () => {
			const workflowDataProxy = executeSingleContext.getWorkflowDataProxy();
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

			expect(executeSingleContext.getInputSourceData()).toEqual(inputSourceData);
		});

		it('should throw an error if the source data is missing', () => {
			executeData.source = null;

			expect(() => executeSingleContext.getInputSourceData()).toThrow(ApplicationError);
		});
	});

	describe('logAiEvent', () => {
		it('should log the AI event correctly', () => {
			const eventName = 'ai-tool-called';
			const msg = 'test message';

			executeSingleContext.logAiEvent(eventName, msg);

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
			const context = new ExecuteSingleContext(
				workflow,
				node,
				additionalData,
				mode,
				runExecutionData,
				runIndex,
				connectionInputData,
				inputData,
				itemIndex,
				executeData,
				abortSignal,
			);

			const metadata: ITaskMetadata = {
				subExecution: {
					workflowId: '123',
					executionId: 'xyz',
				},
			};

			expect(context.getExecuteData().metadata?.subExecution).toEqual(undefined);
			context.setMetadata(metadata);
			expect(context.getExecuteData().metadata?.subExecution).toEqual(metadata.subExecution);
		});
	});
});

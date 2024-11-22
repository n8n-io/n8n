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
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

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
			expect(supplyDataContext.getExecutionCancelSignal()).toBe(abortSignal);
		});
	});

	describe('continueOnFail', () => {
		afterEach(() => {
			node.onError = undefined;
			node.continueOnFail = false;
		});

		it('should return false for nodes by default', () => {
			expect(supplyDataContext.continueOnFail()).toEqual(false);
		});

		it('should return true if node has continueOnFail set to true', () => {
			node.continueOnFail = true;
			expect(supplyDataContext.continueOnFail()).toEqual(true);
		});

		test.each([
			['continueRegularOutput', true],
			['continueErrorOutput', true],
			['stopWorkflow', false],
		])('if node has onError set to %s, it should return %s', (onError, expected) => {
			node.onError = onError as OnError;
			expect(supplyDataContext.continueOnFail()).toEqual(expected);
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

			expect(supplyDataContext.evaluateExpression(expression, 0)).toEqual(expectedResult);

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

	describe('getInputData', () => {
		const inputIndex = 0;
		const inputName = 'main';

		afterEach(() => {
			inputData[inputName] = [[{ json: { test: 'data' } }]];
		});

		it('should return the input data correctly', () => {
			const expectedData = [{ json: { test: 'data' } }];

			expect(supplyDataContext.getInputData(inputIndex, inputName)).toEqual(expectedData);
		});

		it('should return an empty array if the input name does not exist', () => {
			const inputName = 'nonExistent';
			expect(supplyDataContext.getInputData(inputIndex, inputName)).toEqual([]);
		});

		it('should throw an error if the input index is out of range', () => {
			const inputIndex = 2;

			expect(() => supplyDataContext.getInputData(inputIndex, inputName)).toThrow(ApplicationError);
		});

		it('should throw an error if the input index was not set', () => {
			inputData.main[inputIndex] = null;

			expect(() => supplyDataContext.getInputData(inputIndex, inputName)).toThrow(ApplicationError);
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

	describe('logAiEvent', () => {
		it('should log the AI event correctly', () => {
			const eventName = 'ai-tool-called';
			const msg = 'test message';

			supplyDataContext.logAiEvent(eventName, msg);

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
});

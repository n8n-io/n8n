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
import { ApplicationError, NodeConnectionTypes } from 'n8n-workflow';

import { describeCommonTests } from './shared-tests';
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
	const runExecutionData = mock<IRunExecutionData>();
	const connectionInputData: INodeExecutionData[] = [];
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

	describeCommonTests(executeSingleContext, {
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
			const expectedData = { json: { test: 'data' } };

			expect(executeSingleContext.getInputData(inputIndex, connectionType)).toEqual(expectedData);
		});

		it('should return an empty object if the input name does not exist', () => {
			const connectionType = 'nonExistent' as typeof NodeConnectionTypes.Main;
			const expectedData = { json: {} };

			expect(executeSingleContext.getInputData(inputIndex, connectionType)).toEqual(expectedData);
		});

		it('should throw an error if the input index is out of range', () => {
			const inputIndex = 1;

			expect(() => executeSingleContext.getInputData(inputIndex, connectionType)).toThrow(
				ApplicationError,
			);
		});

		it('should throw an error if the input index was not set', () => {
			inputData.main[inputIndex] = null;

			expect(() => executeSingleContext.getInputData(inputIndex, connectionType)).toThrow(
				ApplicationError,
			);
		});

		it('should throw an error if the value of input with given index was not set', () => {
			delete inputData.main[inputIndex]![itemIndex];

			expect(() => executeSingleContext.getInputData(inputIndex, connectionType)).toThrow(
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
});

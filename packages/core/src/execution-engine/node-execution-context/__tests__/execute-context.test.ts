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
});

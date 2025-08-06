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
import { ApplicationError, NodeConnectionTypes } from 'n8n-workflow';

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
});

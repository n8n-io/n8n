import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, IWorkflowDataProxyData, INode } from 'n8n-workflow';

import { ExecuteWorkflow } from './ExecuteWorkflow.node';
import { getWorkflowInfo } from './GenericFunctions';

jest.mock('./GenericFunctions');
jest.mock('../../../utils/utilities');

describe('ExecuteWorkflow', () => {
	const executeWorkflow = new ExecuteWorkflow();
	const executeFunctions = mock<IExecuteFunctions>({
		getNodeParameter: jest.fn(),
		getInputData: jest.fn(),
		getWorkflowDataProxy: jest.fn(),
		executeWorkflow: jest.fn(),
		continueOnFail: jest.fn(),
		setMetadata: jest.fn(),
		getNode: jest.fn(),
	});

	beforeEach(() => {
		jest.clearAllMocks();
		executeFunctions.getInputData.mockReturnValue([{ json: { key: 'value' } }]);
		executeFunctions.getWorkflowDataProxy.mockReturnValue({
			$workflow: { id: 'workflowId' },
			$execution: { id: 'executionId' },
		} as unknown as IWorkflowDataProxyData);
	});

	test('should execute workflow in "each" mode and wait for sub-workflow completion', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce(true) // waitForSubWorkflow
			.mockReturnValueOnce([]); // workflowInputs.schema

		executeFunctions.getInputData.mockReturnValue([{ json: { key: 'value' } }]);
		executeFunctions.getWorkflowDataProxy.mockReturnValue({
			$workflow: { id: 'workflowId' },
			$execution: { id: 'executionId' },
		} as unknown as IWorkflowDataProxyData);
		(getWorkflowInfo as jest.Mock).mockResolvedValue({ id: 'subWorkflowId' });
		(executeFunctions.executeWorkflow as jest.Mock).mockResolvedValue({
			executionId: 'subExecutionId',
			data: [[{ json: { key: 'subValue' } }]],
		});

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { key: 'value' },
					index: 0,
					pairedItem: { item: 0 },
					metadata: {
						subExecution: { workflowId: 'subWorkflowId', executionId: 'subExecutionId' },
					},
				},
			],
		]);
	});

	test('should execute workflow in "once" mode and not wait for sub-workflow completion', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('once') // mode
			.mockReturnValueOnce(false) // waitForSubWorkflow
			.mockReturnValueOnce([]); // workflowInputs.schema

		executeFunctions.getInputData.mockReturnValue([{ json: { key: 'value' } }]);

		executeFunctions.executeWorkflow.mockResolvedValue({
			executionId: 'subExecutionId',
			data: [[{ json: { key: 'subValue' } }]],
		});

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { key: 'value' }, index: 0, pairedItem: { item: 0 } }]]);
	});

	test('should handle errors and continue on fail, no items, < 1.3 version', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce(true) // waitForSubWorkflow
			.mockReturnValueOnce([]); // workflowInputs.schema

		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.2 } as INode);

		(getWorkflowInfo as jest.Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { error: 'Test error' }, pairedItem: { item: 0 } }]]);
	});

	test('should handle errors and continue on fail, multiple items, < 1.3 version', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce(true) // waitForSubWorkflow
			.mockReturnValue([]); // workflowInputs.schema

		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.2 } as INode);
		executeFunctions.getInputData.mockReturnValueOnce([
			{ json: { key: '1' } },
			{ json: { key: '2' } },
			{ json: { key: '3' } },
		]);

		(getWorkflowInfo as jest.Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([
			[{ json: { error: 'Test error' }, pairedItem: { item: 0 }, metadata: undefined }],
			[{ json: { error: 'Test error' }, pairedItem: { item: 1 }, metadata: undefined }],
			[{ json: { error: 'Test error' }, pairedItem: { item: 2 }, metadata: undefined }],
		]);
	});

	test('should handle errors and continue on fail, no items, >= 1.3 version', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce(true) // waitForSubWorkflow
			.mockReturnValueOnce([]); // workflowInputs.schema

		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.3 } as INode);

		(getWorkflowInfo as jest.Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { error: 'Test error' }, pairedItem: { item: 0 } }]]);
	});

	test('should handle errors and continue on fail, multiple items, >= 1.3 version', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce(true) // waitForSubWorkflow
			.mockReturnValueOnce([]); // workflowInputs.schema

		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.3 } as INode);
		executeFunctions.getInputData.mockReturnValueOnce([
			{ json: { key: '1' } },
			{ json: { key: '2' } },
			{ json: { key: '3' } },
		]);

		(getWorkflowInfo as jest.Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{ json: { error: 'Test error' }, pairedItem: { item: 0 }, metadata: undefined },
				{ json: { error: 'Test error' }, pairedItem: { item: 1 }, metadata: undefined },
				{ json: { error: 'Test error' }, pairedItem: { item: 2 }, metadata: undefined },
			],
		]);
	});

	test('should throw error if not continuing on fail', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce(true) // waitForSubWorkflow
			.mockReturnValueOnce([]); // workflowInputs.schema

		(getWorkflowInfo as jest.Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as jest.Mock).mockReturnValue(false);

		await expect(executeWorkflow.execute.call(executeFunctions)).rejects.toThrow(
			'Error executing workflow with item at index 0',
		);
	});
});

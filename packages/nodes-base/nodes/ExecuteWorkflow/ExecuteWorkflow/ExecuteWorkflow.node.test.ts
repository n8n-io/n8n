import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, IWorkflowDataProxyData, INode } from 'n8n-workflow';

import { ExecuteWorkflow } from './ExecuteWorkflow.node';
import { getWorkflowInfo } from './GenericFunctions';
import type { Mock } from 'vitest';

vi.mock('./GenericFunctions');
vi.mock('../../../utils/utilities');

describe('ExecuteWorkflow', () => {
	const executeWorkflow = new ExecuteWorkflow();
	const executeFunctions = mock<IExecuteFunctions>({
		getNodeParameter: vi.fn(),
		getInputData: vi.fn(),
		getWorkflowDataProxy: vi.fn(),
		executeWorkflow: vi.fn(),
		continueOnFail: vi.fn(),
		setMetadata: vi.fn(),
		getNode: vi.fn(),
	});

	beforeEach(() => {
		vi.clearAllMocks();
		executeFunctions.getInputData.mockReturnValue([{ json: { key: 'value' } }]);
		executeFunctions.getWorkflowDataProxy.mockReturnValue({
			$workflow: { id: 'workflowId' },
			$execution: { id: 'executionId' },
		} as unknown as IWorkflowDataProxyData);
	});

	test('should document pass-through and declared workflow input mappings for the builder', () => {
		const workflowInputs = executeWorkflow.description.properties.find(
			(property) => property.name === 'workflowInputs',
		);
		const propertyHint = workflowInputs?.builderHint?.propertyHint;
		const mappingPatterns = executeWorkflow.description.builderHint?.extraTypeDefContent
			?.map(({ content }) => content)
			.join('\n');

		expect(propertyHint).toContain('temporary UI initialization state');
		expect(propertyHint).toContain('must never be emitted');
		expect(propertyHint).toContain("trigger is set to 'Accept all data'");
		expect(propertyHint).toContain('Omit workflowInputs');
		expect(propertyHint).toContain('value and schema fields exactly match');
		expect(mappingPatterns).toContain('Omit workflowInputs from parameters');
		expect(mappingPatterns).toContain("orderId: expr('{{ $json.id }}')");
		expect(mappingPatterns).toContain("amount: expr('{{ $json.total }}')");
		expect(mappingPatterns).toContain("id: 'orderId'");
		expect(mappingPatterns).toContain("type: 'string'");
		expect(mappingPatterns).toContain("id: 'amount'");
		expect(mappingPatterns).toContain("type: 'number'");
		expect(mappingPatterns).toContain('matchingColumns: []');
		expect(mappingPatterns).toContain('attemptToConvertTypes: false');
		expect(mappingPatterns).not.toContain('convertFieldsToString');
	});

	test('should offer both all-items and per-item execution modes', () => {
		const mode = executeWorkflow.description.properties.find((property) => property.name === 'mode');

		expect(mode?.options).toEqual([
			expect.objectContaining({ name: 'Run once with all items', value: 'once' }),
			expect.objectContaining({ name: 'Run once for each item', value: 'each' }),
		]);
		expect(
			executeWorkflow.description.properties.some(
				(property) => property.name === 'eachModeDeprecationNotice',
			),
		).toBe(false);
	});

	test('should execute workflow in "each" mode and wait for sub-workflow completion', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce({}) // workflowInputs.value (item 0)
			.mockReturnValueOnce({}) // workflowInputs.value (item 1)
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce(true) // waitForSubWorkflow (item 0)
			.mockReturnValueOnce(true); // waitForSubWorkflow (item 1)

		executeFunctions.getInputData.mockReturnValue([
			{ json: { key: 'value-0' } },
			{ json: { key: 'value-1' } },
		]);
		executeFunctions.getWorkflowDataProxy.mockReturnValue({
			$workflow: { id: 'workflowId' },
			$execution: { id: 'executionId' },
		} as unknown as IWorkflowDataProxyData);
		(getWorkflowInfo as Mock).mockResolvedValue({ id: 'subWorkflowId' });
		(executeFunctions.executeWorkflow as Mock)
			.mockResolvedValueOnce({
				executionId: 'subExecutionId-0',
				data: [[{ json: { key: 'subValue-0' } }]],
			})
			.mockResolvedValueOnce({
				executionId: 'subExecutionId-1',
				data: [[{ json: { key: 'subValue-1' } }]],
			});

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { key: 'subValue-0' },
					pairedItem: { item: 0 },
					metadata: {
						subExecution: { workflowId: 'subWorkflowId', executionId: 'subExecutionId-0' },
					},
				},
				{
					json: { key: 'subValue-1' },
					pairedItem: { item: 1 },
					metadata: {
						subExecution: { workflowId: 'subWorkflowId', executionId: 'subExecutionId-1' },
					},
				},
			],
		]);

		expect(executeFunctions.executeWorkflow).toHaveBeenCalledTimes(2);
		expect(executeFunctions.executeWorkflow).toHaveBeenNthCalledWith(
			1,
			{ id: 'subWorkflowId' },
			[{ json: { key: 'value-0' }, index: 0, pairedItem: { item: 0 }, binary: undefined }],
			undefined,
			{
				parentExecution: {
					executionId: 'executionId',
					workflowId: 'workflowId',
					shouldResume: true,
				},
			},
		);
		expect(executeFunctions.executeWorkflow).toHaveBeenNthCalledWith(
			2,
			{ id: 'subWorkflowId' },
			[{ json: { key: 'value-1' }, index: 1, pairedItem: { item: 1 }, binary: undefined }],
			undefined,
			{
				parentExecution: {
					executionId: 'executionId',
					workflowId: 'workflowId',
					shouldResume: true,
				},
			},
		);
	});

	test('should execute workflow in "each" mode without waiting for sub-workflow completion', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce({}) // workflowInputs.value (item 0)
			.mockReturnValueOnce({}) // workflowInputs.value (item 1)
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce(false) // waitForSubWorkflow (item 0)
			.mockReturnValueOnce(false); // waitForSubWorkflow (item 1)

		executeFunctions.getInputData.mockReturnValue([
			{ json: { key: 'value-0' } },
			{ json: { key: 'value-1' } },
		]);
		(getWorkflowInfo as Mock).mockResolvedValue({ id: 'subWorkflowId' });
		executeFunctions.executeWorkflow
			.mockResolvedValueOnce({ executionId: 'subExecutionId-0', data: [] })
			.mockResolvedValueOnce({ executionId: 'subExecutionId-1', data: [] });

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { key: 'value-0' },
					index: 0,
					pairedItem: { item: 0 },
					binary: undefined,
					metadata: {
						subExecution: { workflowId: 'subWorkflowId', executionId: 'subExecutionId-0' },
					},
				},
				{
					json: { key: 'value-1' },
					index: 1,
					pairedItem: { item: 1 },
					binary: undefined,
					metadata: {
						subExecution: { workflowId: 'subWorkflowId', executionId: 'subExecutionId-1' },
					},
				},
			],
		]);
		expect(executeFunctions.executeWorkflow).toHaveBeenCalledTimes(2);
		expect(executeFunctions.executeWorkflow).toHaveBeenNthCalledWith(
			1,
			{ id: 'subWorkflowId' },
			[{ json: { key: 'value-0' }, index: 0, pairedItem: { item: 0 }, binary: undefined }],
			undefined,
			{
				doNotWaitToFinish: true,
				parentExecution: {
					executionId: 'executionId',
					workflowId: 'workflowId',
					shouldResume: false,
				},
			},
		);
		expect(executeFunctions.executeWorkflow).toHaveBeenNthCalledWith(
			2,
			{ id: 'subWorkflowId' },
			[{ json: { key: 'value-1' }, index: 1, pairedItem: { item: 1 }, binary: undefined }],
			undefined,
			{
				doNotWaitToFinish: true,
				parentExecution: {
					executionId: 'executionId',
					workflowId: 'workflowId',
					shouldResume: false,
				},
			},
		);
	});

	test('should execute workflow in "once" mode and not wait for sub-workflow completion', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('once') // mode
			.mockReturnValueOnce({}) // workflowInputs.value
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce(false); // waitForSubWorkflow

		executeFunctions.getInputData.mockReturnValue([{ json: { key: 'value' } }]);
		(getWorkflowInfo as Mock).mockResolvedValue({ id: 'subWorkflowId' });

		executeFunctions.executeWorkflow.mockResolvedValue({
			executionId: 'subExecutionId',
			data: [[{ json: { key: 'subValue' } }]],
		});

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([
			[{ json: { key: 'value' }, index: 0, pairedItem: { item: 0 }, binary: undefined }],
		]);

		// Verify shouldResume is set to false
		expect(executeFunctions.executeWorkflow).toHaveBeenCalledWith(
			{ id: 'subWorkflowId' },
			[{ json: { key: 'value' }, index: 0, pairedItem: { item: 0 }, binary: undefined }],
			undefined,
			{
				doNotWaitToFinish: true,
				parentExecution: {
					executionId: 'executionId',
					workflowId: 'workflowId',
					shouldResume: false,
				},
			},
		);
	});

	test('should handle errors and continue on fail, no items, < 1.3 version', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce({}) // workflowInputs.value
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce(true); // waitForSubWorkflow

		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.2 } as INode);

		(getWorkflowInfo as Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as Mock).mockReturnValue(true);

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { error: 'Test error' }, pairedItem: { item: 0 } }]]);
	});

	test('should handle errors and continue on fail, multiple items, < 1.3 version', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce({}) // workflowInputs.value (item 0)
			.mockReturnValueOnce({}) // workflowInputs.value (item 1)
			.mockReturnValueOnce({}) // workflowInputs.value (item 2)
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce(true) // waitForSubWorkflow (item 0)
			.mockReturnValueOnce(true) // waitForSubWorkflow (item 1)
			.mockReturnValueOnce(true); // waitForSubWorkflow (item 2)

		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.2 } as INode);
		executeFunctions.getInputData.mockReturnValueOnce([
			{ json: { key: '1' } },
			{ json: { key: '2' } },
			{ json: { key: '3' } },
		]);

		(getWorkflowInfo as Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as Mock).mockReturnValue(true);

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
			.mockReturnValueOnce({}) // workflowInputs.value
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce(true); // waitForSubWorkflow

		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.3 } as INode);

		(getWorkflowInfo as Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as Mock).mockReturnValue(true);

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { error: 'Test error' }, pairedItem: { item: 0 } }]]);
	});

	test('should handle errors and continue on fail, multiple items, >= 1.3 version', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce('each') // mode
			.mockReturnValueOnce({}) // workflowInputs.value (item 0)
			.mockReturnValueOnce({}) // workflowInputs.value (item 1)
			.mockReturnValueOnce({}) // workflowInputs.value (item 2)
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce(true) // waitForSubWorkflow (item 0)
			.mockReturnValueOnce(true) // waitForSubWorkflow (item 1)
			.mockReturnValueOnce(true); // waitForSubWorkflow (item 2)

		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.3 } as INode);
		executeFunctions.getInputData.mockReturnValueOnce([
			{ json: { key: '1' } },
			{ json: { key: '2' } },
			{ json: { key: '3' } },
		]);

		(getWorkflowInfo as Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as Mock).mockReturnValue(true);

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
			.mockReturnValueOnce({}) // workflowInputs.value
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce(true); // waitForSubWorkflow

		(getWorkflowInfo as Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as Mock).mockReturnValue(false);

		await expect(executeWorkflow.execute.call(executeFunctions)).rejects.toThrow(
			'Error executing workflow with item at index 0',
		);
	});
});

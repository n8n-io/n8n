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
		executeFunctions.getNode.mockReturnValue({ typeVersion: 1.3, parameters: {} } as INode);
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
		expect(mappingPatterns).toContain('convertFieldsToString: true');
	});

	test('should throw when a node still carries the removed "each" mode', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce({}) // workflowInputs.value
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce('each'); // mode

		await expect(executeWorkflow.execute.call(executeFunctions)).rejects.toThrow(
			'The "Run once for each item" mode is no longer available',
		);
		expect(executeFunctions.executeWorkflow).not.toHaveBeenCalled();
	});

	test('should execute workflow in "once" mode and not wait for sub-workflow completion', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce({}) // workflowInputs.value
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce('once') // mode
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

	test('should handle errors and continue on fail in "once" mode', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce({}) // workflowInputs.value
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce('once') // mode
			.mockReturnValueOnce(true); // waitForSubWorkflow

		(getWorkflowInfo as Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as Mock).mockReturnValue(true);

		const result = await executeWorkflow.execute.call(executeFunctions);

		expect(result).toEqual([
			// generatePairedItemData is auto-mocked, so pairedItem resolves to undefined here
			[{ json: { error: 'Test error' }, metadata: undefined, pairedItem: undefined }],
		]);
	});

	test('should throw error if not continuing on fail', async () => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('database') // source
			.mockReturnValueOnce({}) // workflowInputs.value
			.mockReturnValueOnce([]) // workflowInputs.schema
			.mockReturnValueOnce('once') // mode
			.mockReturnValueOnce(true); // waitForSubWorkflow

		(getWorkflowInfo as Mock).mockRejectedValue(new Error('Test error'));
		(executeFunctions.continueOnFail as Mock).mockReturnValue(false);

		await expect(executeWorkflow.execute.call(executeFunctions)).rejects.toThrow('Test error');
	});
});

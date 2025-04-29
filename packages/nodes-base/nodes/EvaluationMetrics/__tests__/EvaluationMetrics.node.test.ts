import { mock } from 'jest-mock-extended';
import type { INodeTypes, IExecuteFunctions, AssignmentCollectionValue } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { EvaluationMetrics } from '../EvaluationMetrics.node';

describe('EvaluationMetrics Node', () => {
	const nodeTypes = mock<INodeTypes>();
	const evaluationMetricsNode = new EvaluationMetrics();

	let mockExecuteFunction: IExecuteFunctions;

	function getMockExecuteFunction(metrics: AssignmentCollectionValue['assignments']) {
		return {
			getInputData: jest.fn().mockReturnValue([{}]),

			getNodeParameter: jest.fn().mockReturnValueOnce({
				assignments: metrics,
			}),

			getNode: jest.fn().mockReturnValue({
				typeVersion: 1,
			}),
		} as unknown as IExecuteFunctions;
	}

	beforeAll(() => {
		mockExecuteFunction = getMockExecuteFunction([
			{
				id: '1',
				name: 'Accuracy',
				value: 0.95,
				type: 'number',
			},
			{
				id: '2',
				name: 'Latency',
				value: 100,
				type: 'number',
			},
		]);
		nodeTypes.getByName.mockReturnValue(evaluationMetricsNode);
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should output the defined metrics', async () => {
			const result = await evaluationMetricsNode.execute.call(mockExecuteFunction);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);

			const outputItem = result[0][0].json;
			expect(outputItem).toEqual({
				Accuracy: 0.95,
				Latency: 100,
			});
		});

		it('should handle no metrics defined', async () => {
			const result = await evaluationMetricsNode.execute.call(mockExecuteFunction);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({});
		});

		it('should convert string values to numbers', async () => {
			const mockExecuteWithStringValues = getMockExecuteFunction([
				{
					id: '1',
					name: 'Accuracy',
					value: '0.95',
					type: 'number',
				},
				{
					id: '2',
					name: 'Latency',
					value: '100',
					type: 'number',
				},
			]);

			const result = await evaluationMetricsNode.execute.call(mockExecuteWithStringValues);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);

			const outputItem = result[0][0].json;
			expect(outputItem).toEqual({
				Accuracy: 0.95,
				Latency: 100,
			});
		});

		it('should throw error for non-numeric string values', async () => {
			const mockExecuteWithInvalidValue = getMockExecuteFunction([
				{
					id: '1',
					name: 'Accuracy',
					value: 'not-a-number',
					type: 'number',
				},
			]);

			await expect(evaluationMetricsNode.execute.call(mockExecuteWithInvalidValue)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});
});

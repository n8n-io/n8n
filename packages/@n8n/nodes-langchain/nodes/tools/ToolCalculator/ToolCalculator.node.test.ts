import { Calculator } from '@langchain/community/tools/calculator';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import { ToolCalculator } from './ToolCalculator.node';

describe('ToolCalculator', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should return Calculator tool instance', async () => {
			const node = new ToolCalculator();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ name: 'test calculator' })),
				}),
			);

			expect(supplyDataResult.response).toBeInstanceOf(Calculator);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should execute calculator and return result', async () => {
			const node = new ToolCalculator();
			const inputData: INodeExecutionData[] = [
				{
					json: { input: '2 + 2' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test calculator' })),
			});

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: '4',
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);
		});

		it('should handle multiple input items', async () => {
			const node = new ToolCalculator();
			const inputData: INodeExecutionData[] = [
				{
					json: { input: '2 + 2' },
				},
				{
					json: { input: '5 * 3' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test calculator' })),
			});

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: '4',
						},
						pairedItem: {
							item: 0,
						},
					},
					{
						json: {
							response: '15',
						},
						pairedItem: {
							item: 1,
						},
					},
				],
			]);
		});
	});
});

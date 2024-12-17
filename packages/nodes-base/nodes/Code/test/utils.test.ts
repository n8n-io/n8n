import type { INodeExecutionData } from 'n8n-workflow';
import { NodeExecutionOutput } from 'n8n-workflow';
import { addPostExecutionWarning } from '../utils';

describe('addPostExecutionWarning', () => {
	const inputItemsLength = 2;

	it('should return a NodeExecutionOutput warning when returnData length differs from inputItemsLength', () => {
		const returnData: INodeExecutionData[] = [{ json: {}, pairedItem: 0 }];

		const result = addPostExecutionWarning(returnData, inputItemsLength);

		expect(result).toBeInstanceOf(NodeExecutionOutput);
		expect((result as NodeExecutionOutput)?.getHints()).toEqual([
			{
				message:
					'To make sure expressions after this node work, return the input items that produced each output item. <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/">More info</a>',
				location: 'outputPane',
			},
		]);
	});

	it('should return a NodeExecutionOutput warning when any item has undefined pairedItem', () => {
		const returnData: INodeExecutionData[] = [{ json: {}, pairedItem: 0 }, { json: {} }];

		const result = addPostExecutionWarning(returnData, inputItemsLength);

		expect(result).toBeInstanceOf(NodeExecutionOutput);
		expect((result as NodeExecutionOutput)?.getHints()).toEqual([
			{
				message:
					'To make sure expressions after this node work, return the input items that produced each output item. <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/">More info</a>',
				location: 'outputPane',
			},
		]);
	});

	it('should return returnData array when all items match inputItemsLength and have defined pairedItem', () => {
		const returnData: INodeExecutionData[] = [
			{ json: {}, pairedItem: 0 },
			{ json: {}, pairedItem: 1 },
		];

		const result = addPostExecutionWarning(returnData, inputItemsLength);

		expect(result).toEqual([returnData]);
	});
});

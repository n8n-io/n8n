import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DocumentDefaultDataLoader } from '../DocumentDefaultDataLoader.node';

jest.mock('@langchain/textsplitters', () => ({
	RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
		splitDocuments: jest.fn(
			async (docs: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> =>
				docs.map((doc) => ({ ...doc, split: true })),
		),
	})),
}));

describe('DocumentDefaultDataLoader', () => {
	let loader: DocumentDefaultDataLoader;

	beforeEach(() => {
		loader = new DocumentDefaultDataLoader();
		jest.clearAllMocks();
	});

	it('should supply data with recursive char text splitter', async () => {
		const context = {
			getNode: jest.fn(() => ({ typeVersion: 1.1 })),
			getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
				switch (paramName) {
					case 'dataType':
						return 'json';
					case 'textSplittingMode':
						return 'simple';
					case 'binaryDataKey':
						return 'data';
					default:
						return;
				}
			}),
		} as unknown as ISupplyDataFunctions;

		await loader.supplyData.call(context, 0);
		expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
	});

	it('should supply data with custom text splitter', async () => {
		const customSplitter = { splitDocuments: jest.fn(async (docs) => docs) };
		const context = {
			getNode: jest.fn(() => ({ typeVersion: 1.1 })),
			getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
				switch (paramName) {
					case 'dataType':
						return 'json';
					case 'textSplittingMode':
						return 'custom';
					case 'binaryDataKey':
						return 'data';
					default:
						return;
				}
			}),
			getInputConnectionData: jest.fn(async () => customSplitter),
		} as unknown as ISupplyDataFunctions;
		await loader.supplyData.call(context, 0);
		expect(context.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiTextSplitter,
			0,
		);
	});
});

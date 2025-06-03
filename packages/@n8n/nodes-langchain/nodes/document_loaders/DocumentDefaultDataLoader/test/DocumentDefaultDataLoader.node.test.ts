import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DocumentDefaultDataLoaderV2 } from '../V2/DocumentDefaultDataLoaderV2.node';

jest.mock('@langchain/textsplitters', () => ({
	RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
		splitDocuments: jest.fn(
			async (docs: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> =>
				docs.map((doc) => ({ ...doc, split: true })),
		),
	})),
}));

const mockNodeTypeBaseDescription: INodeTypeBaseDescription = {
	displayName: 'Default Data Loader',
	name: 'documentDefaultDataLoader',
	icon: 'file:binary.svg',
	group: ['transform'],
	description: 'Load data from previous step in the workflow',
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Document Loaders'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentdefaultdataloader/',
				},
			],
		},
	},
	defaultVersion: 2,
};

describe('DocumentDefaultDataLoader', () => {
	let loader: DocumentDefaultDataLoaderV2;

	beforeEach(() => {
		loader = new DocumentDefaultDataLoaderV2(mockNodeTypeBaseDescription);
		jest.clearAllMocks();
	});

	it('should supply data with recursive char text splitter', async () => {
		await loader.supplyData.call(
			mock<ISupplyDataFunctions>({
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
			}),
			0,
		);
		expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
	});

	it('should supply data with custom text splitter', async () => {
		const customSplitter = { splitDocuments: jest.fn(async (docs) => docs) };
		const context = mock<ISupplyDataFunctions>({
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
		});
		await loader.supplyData.call(context, 0);
		expect(context.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiTextSplitter,
			0,
		);
	});
});

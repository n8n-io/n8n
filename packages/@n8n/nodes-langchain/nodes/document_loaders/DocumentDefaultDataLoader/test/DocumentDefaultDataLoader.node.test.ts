import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DocumentDefaultDataLoader } from '../DocumentDefaultDataLoader.node';

const mockRecursiveCharacterTextSplitterConstructor = vi.hoisted(() => vi.fn());

vi.mock('@langchain/textsplitters', () => ({
	RecursiveCharacterTextSplitter: class {
		constructor(...args: unknown[]) {
			mockRecursiveCharacterTextSplitterConstructor.apply(undefined, args);
		}

		splitDocuments = vi.fn(
			async (docs: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> =>
				docs.map((doc) => ({ ...doc, split: true })),
		);
	},
}));

// Not used in the test but importing inside tests breaks tests, therefore we mock it
vi.mock('pdf-parse', () => ({}));

describe('DocumentDefaultDataLoader', () => {
	let loader: DocumentDefaultDataLoader;

	beforeEach(() => {
		loader = new DocumentDefaultDataLoader();
		vi.clearAllMocks();
	});

	it('should supply data with recursive char text splitter', async () => {
		const context = {
			getNode: vi.fn(() => ({ typeVersion: 1.1 })),
			getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
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
		expect(mockRecursiveCharacterTextSplitterConstructor).toHaveBeenCalledWith({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
	});

	it('should supply data with custom text splitter', async () => {
		const customSplitter = { splitDocuments: vi.fn(async (docs) => docs) };
		const context = {
			getNode: vi.fn(() => ({ typeVersion: 1.1 })),
			getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
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
			getInputConnectionData: vi.fn(async () => customSplitter),
		} as unknown as ISupplyDataFunctions;
		await loader.supplyData.call(context, 0);
		expect(context.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiTextSplitter,
			0,
		);
	});
});

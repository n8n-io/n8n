import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

import { DocumentDefaultDataLoader } from '../DocumentDefaultDataLoader.node';

jest.mock('@langchain/textsplitters', () => ({
	RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
		splitDocuments: jest.fn(async (docs) => docs.map((doc) => ({ ...doc, split: true }))),
	})),
}));

const mockLogger = { debug: jest.fn() };

function createMockThis(overrides: Partial<any> = {}) {
	return {
		logger: mockLogger,
		getNodeParameter: jest.fn((name, idx, def) => {
			const params = {
				dataType: 'json',
				textSplittingMode: 'simple',
				binaryDataKey: 'data',
			};
			return params[name] ?? def;
		}),
		getInputConnectionData: jest.fn(),
		addInputData: jest.fn(() => ({ index: 0 })),
		addOutputData: jest.fn(),
		...overrides,
	};
}

describe('DocumentDefaultDataLoader', () => {
	let loader: DocumentDefaultDataLoader;

	beforeEach(() => {
		loader = new DocumentDefaultDataLoader();
		jest.clearAllMocks();
	});

	it('should use RecursiveCharacterTextSplitter when textSplittingMode is simple', async () => {
		const context = createMockThis();
		const result = await loader.supplyData.call(context, 0);

		expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
		expect(result.response).toBeDefined();
	});
});

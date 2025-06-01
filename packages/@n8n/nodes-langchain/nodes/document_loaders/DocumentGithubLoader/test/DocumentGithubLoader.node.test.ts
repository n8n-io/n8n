import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DocumentGithubLoader } from '../DocumentGithubLoader.node';

jest.mock('@langchain/textsplitters', () => ({
	RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
		splitDocuments: jest.fn(
			async (docs: Array<{ [key: string]: unknown }>): Promise<Array<{ [key: string]: unknown }>> =>
				docs.map((doc) => ({ ...doc, split: true })),
		),
	})),
}));
jest.mock('@langchain/community/document_loaders/web/github', () => ({
	GithubRepoLoader: jest.fn().mockImplementation(() => ({
		load: jest.fn(async () => [{ pageContent: 'doc1' }, { pageContent: 'doc2' }]),
	})),
}));

const mockLogger = { debug: jest.fn() };

describe('DocumentGithubLoader', () => {
	let loader: DocumentGithubLoader;

	beforeEach(() => {
		loader = new DocumentGithubLoader();
		jest.clearAllMocks();
	});

	it('should supply data with custom text splitting', async () => {
		const customSplitter = { splitDocuments: jest.fn(async (docs) => docs) };
		const context = mock<ISupplyDataFunctions>({
			logger: mockLogger,
			getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
				switch (paramName) {
					case 'repository':
						return 'owner/repo';
					case 'branch':
						return 'main';
					case 'textSplittingMode':
						return 'custom';
					case 'additionalOptions':
						return { recursive: true, ignorePaths: 'docs,tests' };
					default:
						return;
				}
			}),
			getCredentials: jest.fn().mockResolvedValue({
				accessToken: 'token',
				server: 'https://api.github.com',
			}),
			getInputConnectionData: jest.fn(async () => customSplitter),
			addInputData: jest.fn(() => ({ index: 0 })),
			addOutputData: jest.fn(),
		});
		await loader.supplyData.call(context, 0);

		expect(context.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiTextSplitter,
			0,
		);
		expect(customSplitter.splitDocuments).toHaveBeenCalled();
	});
});

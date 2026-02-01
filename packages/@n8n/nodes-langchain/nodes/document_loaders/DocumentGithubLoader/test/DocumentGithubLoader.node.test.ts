import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
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

	it('should supply data with recursive char text splitter', async () => {
		const context = {
			logger: mockLogger,
			getNode: jest.fn(() => ({ typeVersion: 1.1 })),
			getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
				switch (paramName) {
					case 'repository':
						return 'owner/repo';
					case 'branch':
						return 'main';
					case 'textSplittingMode':
						return 'simple';
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
			addInputData: jest.fn(() => ({ index: 0 })),
			addOutputData: jest.fn(),
		} as unknown as ISupplyDataFunctions;
		await loader.supplyData.call(context, 0);

		expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
	});

	it('should use custom text splitter when textSplittingMode is custom', async () => {
		const customSplitter = { splitDocuments: jest.fn(async (docs) => docs) };
		const context = {
			logger: mockLogger,
			getNode: jest.fn(() => ({ typeVersion: 1.1 })),
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
		} as unknown as ISupplyDataFunctions;
		await loader.supplyData.call(context, 0);

		expect(context.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiTextSplitter,
			0,
		);
		expect(customSplitter.splitDocuments).toHaveBeenCalled();
	});
});

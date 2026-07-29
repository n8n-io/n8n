import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DocumentGithubLoader } from '../DocumentGithubLoader.node';

const { MockRecursiveCharacterTextSplitter, MockGithubRepoLoader } = vi.hoisted(() => {
	class MockRecursiveCharacterTextSplitter {
		constructor(options: unknown) {
			MockRecursiveCharacterTextSplitter.init(options);
		}

		static init = vi.fn();

		splitDocuments = vi.fn(
			async (docs: Array<{ [key: string]: unknown }>): Promise<Array<{ [key: string]: unknown }>> =>
				docs.map((doc) => ({ ...doc, split: true })),
		);
	}

	class MockGithubRepoLoader {
		load = vi.fn(async () => [{ pageContent: 'doc1' }, { pageContent: 'doc2' }]);
	}

	return { MockRecursiveCharacterTextSplitter, MockGithubRepoLoader };
});

vi.mock('@langchain/textsplitters', () => ({
	RecursiveCharacterTextSplitter: MockRecursiveCharacterTextSplitter,
}));

vi.mock('@langchain/community/document_loaders/web/github', () => ({
	GithubRepoLoader: MockGithubRepoLoader,
}));

const mockLogger = { debug: vi.fn() };

describe('DocumentGithubLoader', () => {
	let loader: DocumentGithubLoader;

	beforeEach(() => {
		loader = new DocumentGithubLoader();
		vi.clearAllMocks();
	});

	it('should supply data with recursive char text splitter', async () => {
		const context = {
			logger: mockLogger,
			getNode: vi.fn(() => ({ typeVersion: 1.1 })),
			getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
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
			getCredentials: vi.fn().mockResolvedValue({
				accessToken: 'token',
				server: 'https://api.github.com',
			}),
			addInputData: vi.fn(() => ({ index: 0 })),
			addOutputData: vi.fn(),
		} as unknown as ISupplyDataFunctions;
		await loader.supplyData.call(context, 0);

		expect(MockRecursiveCharacterTextSplitter.init).toHaveBeenCalledWith({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
	});

	it('should use custom text splitter when textSplittingMode is custom', async () => {
		const customSplitter = { splitDocuments: vi.fn(async (docs) => docs) };
		const context = {
			logger: mockLogger,
			getNode: vi.fn(() => ({ typeVersion: 1.1 })),
			getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
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
			getCredentials: vi.fn().mockResolvedValue({
				accessToken: 'token',
				server: 'https://api.github.com',
			}),
			getInputConnectionData: vi.fn(async () => customSplitter),
			addInputData: vi.fn(() => ({ index: 0 })),
			addOutputData: vi.fn(),
		} as unknown as ISupplyDataFunctions;
		await loader.supplyData.call(context, 0);

		expect(context.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiTextSplitter,
			0,
		);
		expect(customSplitter.splitDocuments).toHaveBeenCalled();
	});
});

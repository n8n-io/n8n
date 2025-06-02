import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DocumentGithubLoaderV2 } from '../V2/DocumentGithubLoaderV2.node';

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

const mockNodeTypeBaseDescription: INodeTypeBaseDescription = {
	displayName: 'GitHub Loader',
	name: 'documentGithubLoader',
	icon: 'file:github.svg',
	group: ['transform'],
	description: 'Load documents from a GitHub repository',
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Document Loaders'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentgithubloader/',
				},
			],
		},
	},
	defaultVersion: 2,
};

describe('DocumentGithubLoader', () => {
	let loader: DocumentGithubLoaderV2;

	beforeEach(() => {
		loader = new DocumentGithubLoaderV2(mockNodeTypeBaseDescription);
		jest.clearAllMocks();
	});

	it('should supply data with recursive char text splitter', async () => {
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
			getInputConnectionData: jest.fn(async () => customSplitter),
			addInputData: jest.fn(() => ({ index: 0 })),
			addOutputData: jest.fn(),
		});
		await loader.supplyData.call(context, 0);

		expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
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

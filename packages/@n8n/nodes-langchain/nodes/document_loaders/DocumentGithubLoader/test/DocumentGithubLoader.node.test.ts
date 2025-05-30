import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
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

function createMockThis(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		logger: mockLogger,
		getNodeParameter: jest.fn(
			(
				name: 'repository' | 'branch' | 'textSplittingMode' | 'additionalOptions',
				idx: number,
				def: unknown,
			): unknown => {
				const params: {
					repository: string;
					branch: string;
					textSplittingMode: string;
					additionalOptions: { recursive: boolean; ignorePaths?: string };
				} = {
					repository: 'owner/repo',
					branch: 'main',
					textSplittingMode: 'simple',
					additionalOptions: { recursive: true, ignorePaths: 'docs,tests' },
				};
				return (params as Record<string, unknown>)[name] ?? def;
			},
		),
		getCredentials: jest.fn(async () => ({
			accessToken: 'token',
			server: 'https://api.github.com',
		})),
		getInputConnectionData: jest.fn(),
		addInputData: jest.fn(() => ({ index: 0 })),
		addOutputData: jest.fn(),
		...overrides,
	};
}

describe('DocumentGithubLoader', () => {
	let loader: DocumentGithubLoader;

	beforeEach(() => {
		loader = new DocumentGithubLoader();
		jest.clearAllMocks();
	});

	it('should supply data with simple text splitting', async () => {
		const context = createMockThis();
		const result = await loader.supplyData.call(context, 0);
		expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
		expect(context.addOutputData).toHaveBeenCalled();
		expect(result.response).toBeDefined();
	});

	it('should supply data with custom text splitter', async () => {
		const customSplitter = { splitDocuments: jest.fn(async (docs) => docs) };
		const context = createMockThis({
			getNodeParameter: jest.fn((name, idx, def) => {
				const params = {
					repository: 'owner/repo',
					branch: 'main',
					textSplittingMode: 'custom',
					additionalOptions: { recursive: false, ignorePaths: '' },
				};
				return params[name] ?? def;
			}),
			getInputConnectionData: jest.fn(async () => customSplitter),
		});
		await loader.supplyData.call(context, 0);

		expect(context.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiTextSplitter,
			0,
		);
		expect(customSplitter.splitDocuments).toHaveBeenCalled();
		expect(context.addOutputData).toHaveBeenCalled();
	});

	it('should handle missing ignorePaths gracefully', async () => {
		const context = createMockThis({
			getNodeParameter: jest.fn(
				(
					name: 'repository' | 'branch' | 'textSplittingMode' | 'additionalOptions',
					idx: number,
					def: unknown,
				): unknown => {
					const params: {
						repository: string;
						branch: string;
						textSplittingMode: string;
						additionalOptions: { recursive: boolean; ignorePaths?: string };
					} = {
						repository: 'owner/repo',
						branch: 'main',
						textSplittingMode: 'simple',
						additionalOptions: { recursive: false },
					};
					return (params as Record<typeof name, unknown>)[name] ?? def;
				},
			),
		});
		await loader.supplyData.call(context, 0);

		expect(GithubRepoLoader).toHaveBeenCalledWith(
			'owner/repo',
			expect.objectContaining({
				ignorePaths: [''],
			}),
		);
	});
});

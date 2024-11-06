import { N8nBinaryLoader } from './N8nBinaryLoader';
import type { TextSplitter } from '@langchain/textsplitters';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

// Mock the helpers module
jest.mock('./helpers', () => ({
	getMetadataFiltersValues: jest.fn().mockReturnValue({}),
}));
jest.mock('langchain/document_loaders/fs/text');
jest.mock('n8n-workflow');

describe('N8nBinaryLoader', () => {
	let mockContext: IExecuteFunctions;
	let testLoader: N8nBinaryLoader;

	beforeEach(() => {
		mockContext = {
			getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			getNodeParameter: jest.fn((parameterName: string, _: number, defaultValue?: any) => {
				switch (parameterName) {
					case 'loader':
						return 'auto';
					case 'binaryMode':
						return 'allInputData';
					case 'options':
						return { metadata: [] };
					default:
						return defaultValue;
				}
			}),
			helpers: {
				assertBinaryData: jest.fn(),
				binaryToBuffer: jest.fn(),
				getBinaryStream: jest.fn(),
			},
			getInputData: jest.fn().mockReturnValue([]),
		} as unknown as IExecuteFunctions;

		testLoader = new N8nBinaryLoader(mockContext);
	});

	describe('processItem with Markdown file', () => {
		it('should process markdown files using TextLoader', async () => {
			const mockMarkdownContent = '# Test Markdown\nThis is a test';
			const mockBinaryData = {
				mimeType: 'text/markdown',
				data: Buffer.from(mockMarkdownContent).toString('base64'),
				fileName: 'test.md',
			};

			mockContext.helpers.assertBinaryData = jest.fn().mockReturnValue(mockBinaryData);

			const mockInputItem: INodeExecutionData = {
				binary: {
					data: mockBinaryData,
				},
				json: {},
			};

			mockContext.getInputData = jest.fn().mockReturnValue([mockInputItem]);

			const expectedDoc = {
				pageContent: mockMarkdownContent,
				metadata: {
					source: 'test.md',
				},
			};

			const TextLoader = require('langchain/document_loaders/fs/text').TextLoader;
			TextLoader.prototype.load = jest.fn().mockResolvedValue([expectedDoc]);

			const result = await testLoader.processItem(mockInputItem, 0);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(expectedDoc);
			expect(TextLoader).toHaveBeenCalled();
			expect(mockContext.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
		});

		it('should handle markdown files with text splitter if provided', async () => {
			const mockTextSplitter: TextSplitter = {
				splitDocuments: jest.fn().mockImplementation((docs) => Promise.resolve(docs)),
			} as unknown as TextSplitter;

			testLoader = new N8nBinaryLoader(mockContext, '', '', mockTextSplitter);

			const mockMarkdownContent = '# Test Markdown\nThis is a test';
			const mockBinaryData = {
				mimeType: 'text/markdown',
				data: Buffer.from(mockMarkdownContent).toString('base64'),
				fileName: 'test.md',
			};

			mockContext.helpers.assertBinaryData = jest.fn().mockReturnValue(mockBinaryData);

			const mockInputItem: INodeExecutionData = {
				binary: {
					data: mockBinaryData,
				},
				json: {},
			};

			mockContext.getInputData = jest.fn().mockReturnValue([mockInputItem]);

			const expectedDoc = {
				pageContent: mockMarkdownContent,
				metadata: {
					source: 'test.md',
				},
			};

			const TextLoader = require('langchain/document_loaders/fs/text').TextLoader;
			TextLoader.prototype.load = jest.fn().mockResolvedValue([expectedDoc]);

			const result = await testLoader.processItem(mockInputItem, 0);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(expectedDoc);
			expect(mockTextSplitter.splitDocuments).toHaveBeenCalledWith([expectedDoc]);
		});

		it('should throw error for unsupported mime type with text loader', async () => {
			const mockBinaryData = {
				mimeType: 'application/pdf',
				data: Buffer.from('test content').toString('base64'),
				fileName: 'test.pdf',
			};

			// Set up context for text loader with PDF file
			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'loader') return 'textLoader';
				if (paramName === 'binaryMode') return 'allInputData';
				if (paramName === 'options') return { metadata: [] };
				return undefined;
			});

			mockContext.helpers.assertBinaryData = jest.fn().mockReturnValue(mockBinaryData);
			mockContext.getInputData = jest.fn().mockReturnValue([
				{
					binary: {
						data: mockBinaryData,
					},
					json: {},
				},
			]);

			const mockInputItem: INodeExecutionData = {
				binary: {
					data: mockBinaryData,
				},
				json: {},
			};

			return testLoader
				.processItem(mockInputItem, 0)
				.then(() => {
					throw new Error('Expected method to reject.');
				})
				.catch((error) => {
					expect(error).toBeInstanceOf(NodeOperationError);
				});
		});
	});
});

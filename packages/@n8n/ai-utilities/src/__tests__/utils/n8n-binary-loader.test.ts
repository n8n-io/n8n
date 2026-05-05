import type { Document } from '@langchain/core/documents';
import type { TextSplitter } from '@langchain/textsplitters';
import type { IBinaryData, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';
import { Readable } from 'stream';

import { N8nBinaryLoader } from 'src/utils/n8n-binary-loader';

// Mock the helpers module
jest.mock('src/utils/helpers', () => ({
	getMetadataFiltersValues: jest.fn(),
}));

// Mock LangChain loaders
jest.mock('@langchain/classic/document_loaders/fs/json', () => ({
	JSONLoader: jest.fn().mockImplementation(() => ({
		load: jest.fn().mockResolvedValue([{ pageContent: 'json content', metadata: {} }]),
	})),
}));

jest.mock('@langchain/classic/document_loaders/fs/text', () => ({
	TextLoader: jest.fn().mockImplementation(() => ({
		load: jest.fn().mockResolvedValue([{ pageContent: 'text content', metadata: {} }]),
	})),
}));

jest.mock('@langchain/community/document_loaders/fs/csv', () => ({
	CSVLoader: jest.fn().mockImplementation(() => ({
		load: jest.fn().mockResolvedValue([{ pageContent: 'csv content', metadata: {} }]),
	})),
}));

jest.mock('@langchain/community/document_loaders/fs/docx', () => ({
	DocxLoader: jest.fn().mockImplementation(() => ({
		load: jest.fn().mockResolvedValue([{ pageContent: 'docx content', metadata: {} }]),
	})),
}));

jest.mock('@langchain/community/document_loaders/fs/epub', () => ({
	EPubLoader: jest.fn().mockImplementation(() => ({
		load: jest.fn().mockResolvedValue([{ pageContent: 'epub content', metadata: {} }]),
	})),
}));

jest.mock('@langchain/community/document_loaders/fs/pdf', () => ({
	PDFLoader: jest.fn().mockImplementation(() => ({
		load: jest.fn().mockResolvedValue([{ pageContent: 'pdf content', metadata: {} }]),
	})),
}));

const { getMetadataFiltersValues } = jest.requireMock('src/utils/helpers');

describe('N8nBinaryLoader', () => {
	let mockContext: jest.MockedObjectDeep<IExecuteFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		mockNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.testNode',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockContext = {
			getNode: jest.fn().mockReturnValue(mockNode),
			getNodeParameter: jest.fn(),
			getInputData: jest.fn().mockReturnValue([]),
			helpers: {
				assertBinaryData: jest.fn(),
				binaryToBuffer: jest.fn(),
				getBinaryStream: jest.fn(),
			},
		} as unknown as jest.MockedObjectDeep<IExecuteFunctions>;

		getMetadataFiltersValues.mockReturnValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create instance with default parameters', () => {
			const loader = new N8nBinaryLoader(mockContext);
			expect(loader).toBeInstanceOf(N8nBinaryLoader);
		});

		it('should create instance with all parameters', () => {
			const mockSplitter = {} as TextSplitter;
			const loader = new N8nBinaryLoader(mockContext, 'prefix.', 'binaryKey', mockSplitter);
			expect(loader).toBeInstanceOf(N8nBinaryLoader);
		});
	});

	describe('processAll', () => {
		it('should return empty array for undefined items', async () => {
			const loader = new N8nBinaryLoader(mockContext);
			const result = await loader.processAll(undefined);

			expect(result).toEqual([]);
		});

		it('should return empty array for empty items', async () => {
			const loader = new N8nBinaryLoader(mockContext);
			const result = await loader.processAll([]);

			expect(result).toEqual([]);
		});

		it('should process multiple items', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'textLoader';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'text/plain',
				data: Buffer.from('test content').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const items: INodeExecutionData[] = [
				{ json: {}, binary: { file: mockBinaryData } },
				{ json: {}, binary: { file: mockBinaryData } },
			];

			const loader = new N8nBinaryLoader(mockContext, '', 'file');
			const result = await loader.processAll(items);

			expect(result).toBeInstanceOf(Array);
		});
	});

	describe('processItem - singleFile mode', () => {
		it('should process text file', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'textLoader';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'text/plain',
				data: Buffer.from('test content').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { data: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'data');
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
			expect(mockContext.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
		});

		it('should process PDF file', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'pdfLoader';
				if (param === 'splitPages') return false;
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'application/pdf',
				data: Buffer.from('fake pdf content').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { document: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'document');
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('splitPages', 0, false);
		});

		it('should process CSV file with options', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'csvLoader';
				if (param === 'column') return 'text';
				if (param === 'separator') return ';';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'text/csv',
				data: Buffer.from('col1;col2\nval1;val2').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { csv: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'csv');
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('column', 0, null);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('separator', 0, ',');
		});

		it('should process JSON file with pointers', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'jsonLoader';
				if (param === 'pointers') return '/data, /items';
				return undefined;
			});

			const jsonData = JSON.stringify({ data: 'test', items: ['item1', 'item2'] });
			const mockBinaryData: IBinaryData = {
				mimeType: 'application/json',
				data: Buffer.from(jsonData).toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { json: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'json');
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('pointers', 0, '');
		});
	});

	describe('processItem - allInputData mode', () => {
		it('should process all binary data from input', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'allInputData';
				if (param === 'loader') return 'auto';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'text/plain',
				data: Buffer.from('test').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			mockContext.getInputData.mockReturnValue([
				{
					json: {},
					binary: {
						file1: mockBinaryData,
						file2: mockBinaryData,
					},
				},
			]);

			const item: INodeExecutionData = {
				json: {},
				binary: {
					file1: mockBinaryData,
					file2: mockBinaryData,
				},
			};

			const loader = new N8nBinaryLoader(mockContext);
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
			expect(mockContext.getInputData).toHaveBeenCalled();
		});

		it('should handle empty binary data in allInputData mode', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'allInputData';
				return undefined;
			});

			mockContext.getInputData.mockReturnValue([{ json: {} }]);

			const item: INodeExecutionData = {
				json: {},
			};

			const loader = new N8nBinaryLoader(mockContext);
			const result = await loader.processItem(item, 0);

			expect(result).toEqual([]);
		});
	});

	describe('validateMimeType', () => {
		it('should throw error when loader does not match mime type', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'pdfLoader';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'text/plain', // Wrong mime type for pdfLoader
				data: Buffer.from('test').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { file: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'file');

			await expect(loader.processItem(item, 0)).rejects.toThrow(NodeOperationError);
			await expect(loader.processItem(item, 0)).rejects.toThrow(
				"Mime type doesn't match selected loader",
			);
		});

		it('should throw error for unsupported mime type', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'auto';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'video/mp4', // Unsupported mime type
				data: Buffer.from('test').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { file: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'file');

			await expect(loader.processItem(item, 0)).rejects.toThrow(NodeOperationError);
			await expect(loader.processItem(item, 0)).rejects.toThrow('Unsupported mime type');
		});

		it('should accept valid mime type for auto loader', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'auto';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'text/plain',
				data: Buffer.from('test').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { file: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'file');
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
		});
	});

	describe('binary data with ID', () => {
		it('should handle binary data with ID', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'textLoader';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				id: 'binary-123',
				mimeType: 'text/plain',
				data: Buffer.from('test content').toString(BINARY_ENCODING),
			};

			const mockStream = Buffer.from('test content');
			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			mockContext.helpers.getBinaryStream.mockResolvedValue(Readable.from(mockStream));
			mockContext.helpers.binaryToBuffer.mockResolvedValue(mockStream);

			const item: INodeExecutionData = {
				json: {},
				binary: { file: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'file');
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
			expect(mockContext.helpers.getBinaryStream).toHaveBeenCalledWith('binary-123');
			expect(mockContext.helpers.binaryToBuffer).toHaveBeenCalled();
		});
	});

	describe('metadata handling', () => {
		it('should add custom metadata to documents', async () => {
			const customMetadata = { source: 'test', type: 'document' };
			getMetadataFiltersValues.mockReturnValue(customMetadata);

			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'textLoader';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'text/plain',
				data: Buffer.from('test').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { file: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'file');
			const result = await loader.processItem(item, 0);

			expect(result.length).toBeGreaterThan(0);
			expect(result[0].metadata).toMatchObject(customMetadata);
		});
	});

	describe('text splitter integration', () => {
		it('should use text splitter when provided', async () => {
			const mockDocuments: Document[] = [
				{ pageContent: 'split 1', metadata: {} },
				{ pageContent: 'split 2', metadata: {} },
			];

			const mockSplitter = {
				splitDocuments: jest.fn().mockResolvedValue(mockDocuments),
			} as unknown as TextSplitter;

			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'textLoader';
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'text/plain',
				data: Buffer.from('test content').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { file: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, '', 'file', mockSplitter);
			await loader.processItem(item, 0);

			expect(mockSplitter.splitDocuments).toHaveBeenCalled();
		});
	});

	describe('options prefix', () => {
		it('should use options prefix for loader parameters', async () => {
			const prefix = 'options.';
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'binaryMode') return 'singleFile';
				if (param === 'loader') return 'pdfLoader';
				if (param === `${prefix}splitPages`) return true;
				return undefined;
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'application/pdf',
				data: Buffer.from('fake pdf').toString(BINARY_ENCODING),
			};

			mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

			const item: INodeExecutionData = {
				json: {},
				binary: { pdf: mockBinaryData },
			};

			const loader = new N8nBinaryLoader(mockContext, prefix, 'pdf');
			await loader.processItem(item, 0);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith(`${prefix}splitPages`, 0, false);
		});
	});

	it('should process text file', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'binaryMode') return 'singleFile';
			if (param === 'loader') return 'textLoader';
			return undefined;
		});

		const mockBinaryData: IBinaryData = {
			mimeType: 'text/plain',
			data: Buffer.from('test content').toString(BINARY_ENCODING),
		};

		mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

		const item: INodeExecutionData = {
			json: {},
			binary: { file: mockBinaryData },
		};

		const loader = new N8nBinaryLoader(mockContext, '', 'file');
		const result = await loader.processItem(item, 0);

		expect(result).toBeInstanceOf(Array);
	});

	it('should process JSON file', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'binaryMode') return 'singleFile';
			if (param === 'loader') return 'jsonLoader';
			if (param === 'pointers') return '';
			return undefined;
		});

		const mockBinaryData: IBinaryData = {
			mimeType: 'application/json',
			data: Buffer.from(JSON.stringify({ test: 'content' })).toString(BINARY_ENCODING),
		};

		mockContext.helpers.assertBinaryData.mockReturnValue(mockBinaryData);

		const item: INodeExecutionData = {
			json: {},
			binary: { file: mockBinaryData },
		};

		const loader = new N8nBinaryLoader(mockContext, '', 'file');
		const result = await loader.processItem(item, 0);

		expect(result).toBeInstanceOf(Array);
	});
});

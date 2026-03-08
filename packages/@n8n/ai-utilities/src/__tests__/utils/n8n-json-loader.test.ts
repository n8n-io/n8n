import type { Document } from '@langchain/core/documents';
import type { TextSplitter } from '@langchain/textsplitters';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { N8nJsonLoader } from 'src/utils/n8n-json-loader';

// Mock the helpers module
jest.mock('src/utils/helpers', () => ({
	getMetadataFiltersValues: jest.fn(),
}));

const { getMetadataFiltersValues } = jest.requireMock('src/utils/helpers');

describe('N8nJsonLoader', () => {
	let mockContext: jest.Mocked<IExecuteFunctions>;
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
		} as unknown as jest.Mocked<IExecuteFunctions>;

		getMetadataFiltersValues.mockReturnValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create instance with default parameters', () => {
			const loader = new N8nJsonLoader(mockContext);
			expect(loader).toBeInstanceOf(N8nJsonLoader);
		});

		it('should create instance with options prefix', () => {
			const loader = new N8nJsonLoader(mockContext, 'prefix.');
			expect(loader).toBeInstanceOf(N8nJsonLoader);
		});

		it('should create instance with text splitter', () => {
			const mockSplitter = {
				splitDocuments: jest.fn(),
			} as unknown as TextSplitter;

			const loader = new N8nJsonLoader(mockContext, '', mockSplitter);
			expect(loader).toBeInstanceOf(N8nJsonLoader);
		});
	});

	describe('processAll', () => {
		it('should return empty array for undefined items', async () => {
			const loader = new N8nJsonLoader(mockContext);
			const result = await loader.processAll(undefined);

			expect(result).toEqual([]);
		});

		it('should return empty array for empty items', async () => {
			const loader = new N8nJsonLoader(mockContext);
			const result = await loader.processAll([]);

			expect(result).toEqual([]);
		});

		it('should process single item', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'jsonMode') return 'allInputData';
				if (param === 'pointers') return '';
				return undefined;
			});

			const items: INodeExecutionData[] = [
				{
					json: { message: 'test data' },
				},
			];

			const loader = new N8nJsonLoader(mockContext);
			const result = await loader.processAll(items);

			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBeGreaterThan(0);
		});

		it('should process multiple items', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'jsonMode') return 'allInputData';
				if (param === 'pointers') return '';
				return undefined;
			});

			const items: INodeExecutionData[] = [
				{ json: { message: 'item 1' } },
				{ json: { message: 'item 2' } },
				{ json: { message: 'item 3' } },
			];

			const loader = new N8nJsonLoader(mockContext);
			const result = await loader.processAll(items);

			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe('processItem - allInputData mode', () => {
		it('should process item in allInputData mode', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'jsonMode') return 'allInputData';
				if (param === 'pointers') return '';
				return undefined;
			});

			const item: INodeExecutionData = {
				json: { test: 'data', nested: { value: 123 } },
			};

			const loader = new N8nJsonLoader(mockContext);
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBeGreaterThan(0);
			expect(result[0]).toHaveProperty('pageContent');
			expect(result[0]).toHaveProperty('metadata');
		});

		it('should process item with JSON pointers in allInputData mode', async () => {
			mockContext.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'jsonMode') return 'allInputData';
				if (param === 'pointers') return '/test, /nested/value';
				return undefined;
			});

			const item: INodeExecutionData = {
				json: { test: 'data', nested: { value: 123 } },
			};

			const loader = new N8nJsonLoader(mockContext);
			const result = await loader.processItem(item, 0);

			expect(result).toBeInstanceOf(Array);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('pointers', 0, '');
		});
	});

	it('should process string data in expressionData mode', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'jsonMode') return 'expressionData';
			if (param === 'jsonData') return 'plain text data';
			if (param === 'pointers') return '';
			return undefined;
		});

		const item: INodeExecutionData = {
			json: {},
		};

		const loader = new N8nJsonLoader(mockContext);
		const result = await loader.processItem(item, 0);

		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBeGreaterThan(0);
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('jsonData', 0);
	});

	it('should process object data in expressionData mode', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'jsonMode') return 'expressionData';
			if (param === 'jsonData') return { test: 'object data' };
			if (param === 'pointers') return '';
			return undefined;
		});

		const item: INodeExecutionData = {
			json: {},
		};

		const loader = new N8nJsonLoader(mockContext);
		const result = await loader.processItem(item, 0);

		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBeGreaterThan(0);
	});

	it('should add metadata to documents', async () => {
		const metadata = { source: 'test', category: 'document' };
		getMetadataFiltersValues.mockReturnValue(metadata);

		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'jsonMode') return 'allInputData';
			if (param === 'pointers') return '';
			return undefined;
		});

		const item: INodeExecutionData = {
			json: { test: 'data' },
		};

		const loader = new N8nJsonLoader(mockContext);
		const result = await loader.processItem(item, 0);

		expect(result.length).toBeGreaterThan(0);
		expect(result[0].metadata).toMatchObject(metadata);
	});

	it('should use text splitter when provided', async () => {
		const mockDocuments: Document[] = [
			{ pageContent: 'split content 1', metadata: {} },
			{ pageContent: 'split content 2', metadata: {} },
		];

		const mockSplitter = {
			splitDocuments: jest.fn().mockResolvedValue(mockDocuments),
		} as unknown as TextSplitter;

		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'jsonMode') return 'allInputData';
			if (param === 'pointers') return '';
			return undefined;
		});

		const item: INodeExecutionData = {
			json: { test: 'data' },
		};

		const loader = new N8nJsonLoader(mockContext, '', mockSplitter);
		const result = await loader.processItem(item, 0);

		expect(mockSplitter.splitDocuments).toHaveBeenCalled();
		expect(result).toEqual(mockDocuments);
	});

	it('should use options prefix for pointers parameter', async () => {
		const prefix = 'customPrefix.';
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'jsonMode') return 'allInputData';
			if (param === `${prefix}pointers`) return '/custom';
			return '';
		});

		const item: INodeExecutionData = {
			json: { test: 'data' },
		};

		const loader = new N8nJsonLoader(mockContext, prefix);
		await loader.processItem(item, 0);

		expect(mockContext.getNodeParameter).toHaveBeenCalledWith(`${prefix}pointers`, 0, '');
	});

	it('should return empty array for null item', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'jsonMode') return 'allInputData';
			if (param === 'pointers') return '';
			return undefined;
		});

		const loader = new N8nJsonLoader(mockContext);
		const result = await loader.processItem(null as unknown as INodeExecutionData, 0);

		expect(result).toEqual([]);
	});

	it('should throw NodeOperationError when document loader is not initialized', async () => {
		// Mock a scenario where documentLoader stays null
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'jsonMode') return 'unknownMode'; // Invalid mode
			if (param === 'pointers') return '';
			return undefined;
		});

		const item: INodeExecutionData = {
			json: { test: 'data' },
		};

		const loader = new N8nJsonLoader(mockContext);

		await expect(loader.processItem(item, 0)).rejects.toThrow(NodeOperationError);
		await expect(loader.processItem(item, 0)).rejects.toThrow('Document loader is not initialized');
	});

	it('should handle complex JSON structures with nesting and arrays', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'jsonMode') return 'allInputData';
			if (param === 'pointers') return '';
			return undefined;
		});

		const item: INodeExecutionData = {
			json: {
				level1: {
					level2: {
						level3: {
							value: 'deep value',
						},
					},
				},
				items: ['item1', 'item2', 'item3'],
			},
		};

		const loader = new N8nJsonLoader(mockContext);
		const result = await loader.processItem(item, 0);

		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBeGreaterThan(0);
	});
});

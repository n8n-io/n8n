import { CohereRerank } from '@langchain/cohere';
import { logWrapper } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mock, Mocked, MockedClass } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { RerankerCohere } from '../RerankerCohere.node';
import { searchModels } from '../methods/searchModels';

// Mock the CohereRerank class
vi.mock('@langchain/cohere', () => ({
	CohereRerank: vi.fn(),
}));

// Mock the logWrapper utility
vi.mock('@n8n/ai-utilities', () => ({
	logWrapper: vi.fn().mockImplementation((obj) => ({ logWrapped: obj })),
}));

const mockNode: INode = {
	id: '1',
	name: 'Reranker Cohere',
	type: '@n8n/n8n-nodes-langchain.rerankerCohere',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('RerankerCohere', () => {
	let rerankerCohere: RerankerCohere;
	let mockSupplyDataFunctions: ISupplyDataFunctions;
	let mockCohereRerank: Mocked<CohereRerank>;

	beforeEach(() => {
		rerankerCohere = new RerankerCohere();

		// Reset the mock
		vi.clearAllMocks();

		// Create a mock CohereRerank instance
		mockCohereRerank = {
			compressDocuments: vi.fn(),
		} as unknown as Mocked<CohereRerank>;

		// Make new CohereRerank() return the mock instance
		(CohereRerank as MockedClass<typeof CohereRerank>).mockImplementation(function () {
			return mockCohereRerank;
		});

		// Create mock supply data functions
		mockSupplyDataFunctions = mock<ISupplyDataFunctions>({
			logger: {
				debug: vi.fn(),
				error: vi.fn(),
				info: vi.fn(),
				warn: vi.fn(),
			},
		});

		// Mock specific methods with proper vi functions
		mockSupplyDataFunctions.getNodeParameter = vi.fn();
		mockSupplyDataFunctions.getCredentials = vi.fn();
	});

	it('should create CohereRerank with default model and return wrapped instance', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as Mock)
			.mockReturnValueOnce('rerank-v3.5') // modelName
			.mockReturnValueOnce(3); // topN (default)
		(mockSupplyDataFunctions.getCredentials as Mock).mockResolvedValue(mockCredentials);

		// Execute
		const result = await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
			'modelName',
			0,
			'rerank-v3.5',
			{ extractValue: true },
		);
		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topN', 0, 3);
		expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalledWith('cohereApi');
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-v3.5',
			topN: 3,
		});
		expect(logWrapper).toHaveBeenCalledWith(mockCohereRerank, mockSupplyDataFunctions);
		expect(result.response).toEqual({ logWrapped: mockCohereRerank });
	});

	it('should create CohereRerank with custom model', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'custom-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as Mock)
			.mockReturnValueOnce('rerank-multilingual-v3.0') // modelName
			.mockReturnValueOnce(3); // topN (default)
		(mockSupplyDataFunctions.getCredentials as Mock).mockResolvedValue(mockCredentials);

		// Execute
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		// Verify
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'custom-api-key',
			model: 'rerank-multilingual-v3.0',
			topN: 3,
		});
	});

	it('should handle different item indices', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as Mock)
			.mockReturnValueOnce('rerank-english-v3.0') // modelName
			.mockReturnValueOnce(3); // topN (default)
		(mockSupplyDataFunctions.getCredentials as Mock).mockResolvedValue(mockCredentials);

		// Execute with different item index
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 2);

		// Verify the correct item index is passed
		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
			'modelName',
			2,
			'rerank-v3.5',
			{ extractValue: true },
		);
		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topN', 2, 3);
	});

	it('should throw error when credentials are missing', async () => {
		// Setup mocks
		(mockSupplyDataFunctions.getNodeParameter as Mock)
			.mockReturnValueOnce('rerank-v3.5') // modelName
			.mockReturnValueOnce(3); // topN (default)
		(mockSupplyDataFunctions.getCredentials as Mock).mockRejectedValue(
			new Error('Missing credentials'),
		);

		// Execute and verify error
		await expect(rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
			'Missing credentials',
		);
	});

	it('should use fallback model when parameter is not provided', async () => {
		// Setup mocks - getNodeParameter returns the fallback value
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as Mock)
			.mockReturnValueOnce('rerank-v3.5') // modelName (fallback value)
			.mockReturnValueOnce(3); // topN (fallback value)
		(mockSupplyDataFunctions.getCredentials as Mock).mockResolvedValue(mockCredentials);

		// Execute
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		// Verify fallback is used
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-v3.5',
			topN: 3,
		});
	});

	it('should create CohereRerank with custom topN value', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as Mock)
			.mockReturnValueOnce('rerank-v3.5') // modelName
			.mockReturnValueOnce(10); // topN (custom value)
		(mockSupplyDataFunctions.getCredentials as Mock).mockResolvedValue(mockCredentials);

		// Execute
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		// Verify custom topN is used
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-v3.5',
			topN: 10,
		});
		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topN', 0, 3);
	});

	it('should create CohereRerank with topN value of 1', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as Mock)
			.mockReturnValueOnce('rerank-english-v3.0') // modelName
			.mockReturnValueOnce(1); // topN (edge case value)
		(mockSupplyDataFunctions.getCredentials as Mock).mockResolvedValue(mockCredentials);

		// Execute
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		// Verify edge case topN is used
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-english-v3.0',
			topN: 1,
		});
	});

	it('should create CohereRerank with large topN value', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as Mock)
			.mockReturnValueOnce('rerank-multilingual-v3.0') // modelName
			.mockReturnValueOnce(100); // topN (large value)
		(mockSupplyDataFunctions.getCredentials as Mock).mockResolvedValue(mockCredentials);

		// Execute
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		// Verify large topN is used
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-multilingual-v3.0',
			topN: 100,
		});
	});

	describe('description', () => {
		it('should declare versions 1 and 2', () => {
			expect(rerankerCohere.description.version).toEqual([1, 2]);
		});

		it('should keep the v1 options parameter, gate it to version 1, and append v4 models', () => {
			const v1Model = rerankerCohere.description.properties.find(
				(property) => property.name === 'modelName' && property.type === 'options',
			);

			expect(v1Model).toBeDefined();
			expect(v1Model?.displayOptions).toEqual({ show: { '@version': [1] } });
			expect(v1Model?.options).toContainEqual({
				name: 'rerank-v4.0-pro',
				value: 'rerank-v4.0-pro',
			});
			expect(v1Model?.options).toContainEqual({
				name: 'rerank-v4.0-fast',
				value: 'rerank-v4.0-fast',
			});
		});

		it('preserves the original v1 option order and appends v4', () => {
			const v1Model = rerankerCohere.description.properties.find(
				(p) => p.name === 'modelName' && p.type === 'options',
			);
			const values = (v1Model?.options as Array<{ value: string }>).map((o) => o.value);

			expect(values).toEqual([
				'rerank-v3.5',
				'rerank-english-v3.0',
				'rerank-multilingual-v3.0',
				'rerank-v4.0-pro',
				'rerank-v4.0-fast',
			]);
		});

		it('should expose a v2 resourceLocator with list and id modes', () => {
			const v2Model = rerankerCohere.description.properties.find(
				(property) => property.name === 'modelName' && property.type === 'resourceLocator',
			);

			expect(v2Model).toMatchObject({
				type: 'resourceLocator',
				default: { mode: 'list', value: 'rerank-v3.5' },
				required: true,
				displayOptions: { show: { '@version': [2] } },
			});
			expect(v2Model?.modes).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'searchModels', searchable: true },
					}),
					expect.objectContaining({
						name: 'id',
						type: 'string',
						placeholder: 'rerank-v4.0-pro',
					}),
				]),
			);
		});

		it('should register searchModels as a listSearch method', () => {
			expect(rerankerCohere.methods?.listSearch).toHaveProperty('searchModels');
			expect(rerankerCohere.methods?.listSearch?.searchModels).toBeTypeOf('function');
		});
	});

	describe('searchModels', () => {
		it('should include both rerank v4 models in the model list', async () => {
			const result = await searchModels.call({} as ILoadOptionsFunctions);

			expect(result.results).toContainEqual({
				name: 'rerank-v4.0-pro',
				value: 'rerank-v4.0-pro',
			});
			expect(result.results).toContainEqual({
				name: 'rerank-v4.0-fast',
				value: 'rerank-v4.0-fast',
			});
		});

		it('filters by substring across value', async () => {
			const v4 = await searchModels.call({} as ILoadOptionsFunctions, 'v4');
			expect(v4.results.map((r) => r.value)).toEqual(['rerank-v4.0-pro', 'rerank-v4.0-fast']);

			const empty = await searchModels.call({} as ILoadOptionsFunctions, '');
			expect(empty.results).toHaveLength(5);
		});
	});

	it('resolves a resourceLocator model value to a plain string', async () => {
		const context = createMockExecuteFunction<ISupplyDataFunctions>(
			{ modelName: { mode: 'list', value: 'rerank-v4.0-pro' }, topN: 3 },
			{ ...mockNode, typeVersion: 2 },
		) as Mocked<ISupplyDataFunctions>;
		context.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-api-key' });
		context.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
		const getNodeParameter = vi.spyOn(context, 'getNodeParameter');

		await rerankerCohere.supplyData.call(context, 0);

		expect(getNodeParameter).toHaveBeenCalledWith('modelName', 0, 'rerank-v3.5', {
			extractValue: true,
		});
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-v4.0-pro',
			topN: 3,
		});
	});

	it('passes an arbitrary id-mode model ID through unchanged', async () => {
		const context = createMockExecuteFunction<ISupplyDataFunctions>(
			{ modelName: { mode: 'id', value: 'customer-rerank-model' }, topN: 3 },
			{ ...mockNode, typeVersion: 2 },
		) as Mocked<ISupplyDataFunctions>;
		context.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-api-key' });
		context.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

		await rerankerCohere.supplyData.call(context, 0);

		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'customer-rerank-model',
			topN: 3,
		});
	});

	it('passes a v1 plain-string model value through unchanged', async () => {
		const context = createMockExecuteFunction<ISupplyDataFunctions>(
			{ modelName: 'rerank-english-v3.0', topN: 3 },
			{ ...mockNode, typeVersion: 1 },
		) as Mocked<ISupplyDataFunctions>;
		context.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-api-key' });
		context.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
		// createMockExecuteFunction resolves `extractValue` by reading `${name}.value`,
		// which returns the fallback for a bare string. Real n8n returns a non-RLC value
		// unchanged, so model that contract to exercise the v1 backward-compat path.
		context.getNodeParameter = vi
			.fn()
			.mockReturnValueOnce('rerank-english-v3.0')
			.mockReturnValueOnce(3);

		await rerankerCohere.supplyData.call(context, 0);

		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-english-v3.0',
			topN: 3,
		});
	});
});

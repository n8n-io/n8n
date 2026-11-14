import { CohereEmbeddings } from '@langchain/cohere';
import { logWrapper } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { IDataObject, ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsCohere } from '../EmbeddingsCohere.node';
import { searchModels } from '../methods/searchModels';

vi.mock('@langchain/cohere', () => ({
	CohereEmbeddings: vi.fn(),
}));

vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual<typeof import('@n8n/ai-utilities')>('@n8n/ai-utilities');
	return {
		...actual,
		logWrapper: vi.fn().mockImplementation((obj) => ({ logWrapped: obj })),
	};
});

const mockNode: INode = {
	id: '1',
	name: 'Embeddings Cohere',
	type: '@n8n/n8n-nodes-langchain.embeddingsCohere',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};

describe('EmbeddingsCohere', () => {
	let embeddingsCohere: EmbeddingsCohere;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const setupMockContext = (nodeParameters: IDataObject) => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			nodeParameters,
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-api-key' });
		mockContext.logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};

		return mockContext;
	};

	beforeEach(() => {
		embeddingsCohere = new EmbeddingsCohere();
		vi.clearAllMocks();
	});

	describe('description', () => {
		it('should declare versions 1 and 2', () => {
			expect(embeddingsCohere.description.version).toEqual([1, 2]);
		});

		it('should keep the v1 options parameter, gate it to version 1, and append embed-v4.0', () => {
			const v1Model = embeddingsCohere.description.properties.find(
				(property) => property.name === 'modelName' && property.type === 'options',
			);

			expect(v1Model).toBeDefined();
			expect(v1Model?.displayOptions).toEqual({ show: { '@version': [1] } });
			expect(v1Model?.options).toContainEqual({ name: 'Embed-v4.0', value: 'embed-v4.0' });
		});

		it('preserves the original v1 option order and appends v4', () => {
			const v1Model = embeddingsCohere.description.properties.find(
				(p) => p.name === 'modelName' && p.type === 'options',
			);
			const values = (v1Model?.options as Array<{ value: string }>).map((o) => o.value);

			expect(values).toEqual([
				'embed-english-light-v2.0',
				'embed-english-light-v3.0',
				'embed-english-v2.0',
				'embed-english-v3.0',
				'embed-multilingual-light-v3.0',
				'embed-multilingual-v2.0',
				'embed-multilingual-v3.0',
				'embed-v4.0',
			]);
		});

		it('should expose a v2 resourceLocator with list and id modes', () => {
			const v2Model = embeddingsCohere.description.properties.find(
				(property) => property.name === 'modelName' && property.type === 'resourceLocator',
			);

			expect(v2Model).toMatchObject({
				type: 'resourceLocator',
				default: { mode: 'list', value: 'embed-english-v2.0' },
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
						placeholder: 'embed-v4.0',
					}),
				]),
			);
		});

		it('should register searchModels as a listSearch method', () => {
			expect(embeddingsCohere.methods?.listSearch).toHaveProperty('searchModels');
			expect(embeddingsCohere.methods?.listSearch?.searchModels).toBeTypeOf('function');
		});
	});

	describe('searchModels', () => {
		it('should include embed-v4.0 in the model list', async () => {
			const result = await searchModels.call({} as ILoadOptionsFunctions);

			expect(result.results).toContainEqual({ name: 'Embed-v4.0', value: 'embed-v4.0' });
		});

		it('filters by substring across name and value', async () => {
			const v4 = await searchModels.call({} as ILoadOptionsFunctions, 'v4');
			expect(v4.results.map((r) => r.value)).toEqual(['embed-v4.0']);

			const multilingual = await searchModels.call({} as ILoadOptionsFunctions, 'MULTILINGUAL');
			expect(multilingual.results.map((r) => r.value).sort()).toEqual([
				'embed-multilingual-light-v3.0',
				'embed-multilingual-v2.0',
				'embed-multilingual-v3.0',
			]);
		});
	});

	describe('supplyData', () => {
		it('should read the resourceLocator value and create CohereEmbeddings', async () => {
			const context = setupMockContext({ modelName: { value: 'embed-v4.0' } });
			const getNodeParameterSpy = vi.spyOn(context, 'getNodeParameter');

			await embeddingsCohere.supplyData.call(context, 0);

			expect(getNodeParameterSpy).toHaveBeenCalledWith('modelName', 0, 'embed-english-v2.0', {
				extractValue: true,
			});
			expect(CohereEmbeddings).toHaveBeenCalledWith({
				apiKey: 'test-api-key',
				model: 'embed-v4.0',
			});
			expect(logWrapper).toHaveBeenCalledWith(expect.anything(), context);
		});

		it('passes an arbitrary id-mode model ID through unchanged', async () => {
			const context = setupMockContext({
				modelName: { mode: 'id', value: 'customer-embed-model' },
			});

			await embeddingsCohere.supplyData.call(context, 0);

			expect(CohereEmbeddings).toHaveBeenCalledWith({
				apiKey: 'test-api-key',
				model: 'customer-embed-model',
			});
		});

		it('should pass a v1 plain-string model value through unchanged', async () => {
			const context = setupMockContext({});
			context.getNodeParameter = vi.fn().mockReturnValue('embed-english-v3.0');

			await embeddingsCohere.supplyData.call(context, 0);

			expect(CohereEmbeddings).toHaveBeenCalledWith({
				apiKey: 'test-api-key',
				model: 'embed-english-v3.0',
			});
		});
	});
});

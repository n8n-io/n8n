import type { MockedFunction } from 'vitest';

import type * as WeaviateUtils from './Weaviate.utils';

const hoisted = vi.hoisted(() => ({
	hybridSearchSpy: vi.fn(),
	superSimilaritySearchSpy: vi.fn(),
	fromDocumentsSpy: vi.fn(),
}));

vi.mock('@langchain/weaviate', () => {
	class WeaviateStore {
		args: unknown;
		embeddings: unknown;
		constructor(embeddings: unknown, args: unknown) {
			this.embeddings = embeddings;
			this.args = args;
		}
		static async fromExistingIndex(embeddings: unknown, args: unknown) {
			// `this` refers to the calling class, so ExtendedWeaviateVectorStore inherits this
			// and gets an instance of itself.
			const Ctor = this as unknown as new (e: unknown, a: unknown) => WeaviateStore;
			return new Ctor(embeddings, args);
		}
		static async fromDocuments(documents: unknown, embeddings: unknown, args: unknown) {
			return await hoisted.fromDocumentsSpy(documents, embeddings, args);
		}
		async hybridSearch(query: string, options: unknown) {
			return await hoisted.hybridSearchSpy(query, options);
		}
		async similaritySearchVectorWithScore(query: number[], k: number, filter: unknown) {
			return await hoisted.superSimilaritySearchSpy(query, k, filter);
		}
	}
	return { WeaviateStore };
});

vi.mock('@n8n/ai-utilities', () => ({
	createVectorStoreNode: (config: {
		getVectorStoreClient: (...args: unknown[]) => unknown;
		populateVectorStore: (...args: unknown[]) => unknown;
	}) =>
		class BaseNode {
			async getVectorStoreClient(...args: unknown[]) {
				return await config.getVectorStoreClient.apply(config, args);
			}
			async populateVectorStore(...args: unknown[]) {
				return await config.populateVectorStore.apply(config, args);
			}
		},
}));

vi.mock('./Weaviate.utils', async () => {
	const actual = await vi.importActual<typeof WeaviateUtils>('./Weaviate.utils');
	return {
		...actual,
		createWeaviateClient: vi.fn(),
	};
});

vi.mock('../shared/methods/listSearch', () => ({
	weaviateCollectionsSearch: vi.fn(),
}));

vi.mock('../shared/descriptions', () => ({
	weaviateCollectionRLC: {},
}));

import { createWeaviateClient } from './Weaviate.utils';
import { VectorStoreWeaviate } from './VectorStoreWeaviate.node';

const MockCreateClient = createWeaviateClient as MockedFunction<typeof createWeaviateClient>;

type NodeWithGetVectorStoreClient = {
	getVectorStoreClient: (
		context: unknown,
		filter: unknown,
		embeddings: unknown,
		itemIndex: number,
	) => Promise<{
		similaritySearchVectorWithScore: (
			query: number[],
			k: number,
			filter?: unknown,
		) => Promise<unknown>;
	}>;
};

type NodeWithPopulateVectorStore = {
	populateVectorStore: (
		context: unknown,
		embeddings: unknown,
		documents: unknown,
		itemIndex: number,
	) => Promise<unknown>;
};

describe('VectorStoreWeaviate.node', () => {
	const baseCredentials = {
		weaviate_cloud_endpoint: 'https://test.weaviate.io',
		weaviate_api_key: 'test-api-key',
	};

	const buildContext = (hybridQuery?: string, extraOptions: Record<string, unknown> = {}) =>
		({
			getCredentials: vi.fn().mockResolvedValue(baseCredentials),
			getNodeParameter: vi.fn((name: string) => {
				if (name === 'weaviateCollection') return 'TestCollection';
				if (name === 'options') {
					return {
						hybridQuery,
						alpha: 0.5,
						fusionType: 'RelativeScore',
						...extraOptions,
					};
				}
				return {};
			}),
			getNode: () => ({ name: 'VectorStoreWeaviate' }),
		}) as never;

	beforeEach(() => {
		vi.clearAllMocks();
		MockCreateClient.mockResolvedValue({} as never);
		hoisted.hybridSearchSpy.mockResolvedValue([]);
		hoisted.superSimilaritySearchSpy.mockResolvedValue([]);
		hoisted.fromDocumentsSpy.mockResolvedValue({});
	});

	describe('hybrid search filter', () => {
		// Regression test for https://github.com/weaviate/weaviate/issues/11262
		// weaviate-client expects the option key `filters` (plural); using `filter` (singular)
		// causes weaviate-client to silently drop the filter.
		it('passes the filter under the "filters" key when hybridQuery is set', async () => {
			const filter = {
				path: ['metadata_document_type'],
				operator: 'Equal',
				valueString: 'Ticket',
			};

			const node = new VectorStoreWeaviate() as unknown as NodeWithGetVectorStoreClient;
			const store = await node.getVectorStoreClient(buildContext('find tickets'), filter, {}, 0);

			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5);

			expect(hoisted.hybridSearchSpy).toHaveBeenCalledTimes(1);
			const [query, options] = hoisted.hybridSearchSpy.mock.calls[0] as [
				string,
				Record<string, unknown>,
			];
			expect(query).toBe('find tickets');
			expect(options).toHaveProperty('filters');
			expect(options.filters).toBeDefined();
			expect(options).not.toHaveProperty('filter');
		});

		it('passes the inline filter argument under the "filters" key', async () => {
			const filter = {
				path: ['metadata_document_type'],
				operator: 'Equal',
				valueString: 'Ticket',
			};

			const node = new VectorStoreWeaviate() as unknown as NodeWithGetVectorStoreClient;
			const store = await node.getVectorStoreClient(buildContext('find tickets'), undefined, {}, 0);

			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5, filter);

			expect(hoisted.hybridSearchSpy).toHaveBeenCalledTimes(1);
			const [, options] = hoisted.hybridSearchSpy.mock.calls[0] as [
				string,
				Record<string, unknown>,
			];
			expect(options).toHaveProperty('filters');
			expect(options.filters).toBeDefined();
			expect(options).not.toHaveProperty('filter');
		});

		it('leaves filters undefined when no filter is provided', async () => {
			const node = new VectorStoreWeaviate() as unknown as NodeWithGetVectorStoreClient;
			const store = await node.getVectorStoreClient(buildContext('find tickets'), undefined, {}, 0);

			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5);

			expect(hoisted.hybridSearchSpy).toHaveBeenCalledTimes(1);
			const [, options] = hoisted.hybridSearchSpy.mock.calls[0] as [
				string,
				Record<string, unknown>,
			];
			expect(options.filters).toBeUndefined();
		});

		it('requests the "explainScore" metadata key when hybridExplainScore is enabled', async () => {
			const node = new VectorStoreWeaviate() as unknown as NodeWithGetVectorStoreClient;
			const store = await node.getVectorStoreClient(
				buildContext('find tickets', { hybridExplainScore: true }),
				undefined,
				{},
				0,
			);

			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5);

			expect(hoisted.hybridSearchSpy).toHaveBeenCalledTimes(1);
			const [, options] = hoisted.hybridSearchSpy.mock.calls[0] as [
				string,
				Record<string, unknown>,
			];
			expect(options.returnMetadata).toEqual(['explainScore']);
		});

		it('leaves returnMetadata undefined when hybridExplainScore is disabled', async () => {
			const node = new VectorStoreWeaviate() as unknown as NodeWithGetVectorStoreClient;
			const store = await node.getVectorStoreClient(
				buildContext('find tickets', { hybridExplainScore: false }),
				undefined,
				{},
				0,
			);

			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5);

			expect(hoisted.hybridSearchSpy).toHaveBeenCalledTimes(1);
			const [, options] = hoisted.hybridSearchSpy.mock.calls[0] as [
				string,
				Record<string, unknown>,
			];
			expect(options.returnMetadata).toBeUndefined();
		});

		it('does not call hybridSearch when hybridQuery is not set', async () => {
			const filter = {
				path: ['metadata_document_type'],
				operator: 'Equal',
				valueString: 'Ticket',
			};

			const node = new VectorStoreWeaviate() as unknown as NodeWithGetVectorStoreClient;
			const store = await node.getVectorStoreClient(buildContext(undefined), undefined, {}, 0);

			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5, filter);

			expect(hoisted.hybridSearchSpy).not.toHaveBeenCalled();
			expect(hoisted.superSimilaritySearchSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('populateVectorStore json schema', () => {
		const jsonSchemaObject = {
			class: 'TestCollection',
			properties: [{ name: 'text', dataType: ['text'] }],
		};

		it('passes a parsed jsonSchema to fromDocuments when provided as a string', async () => {
			const node = new VectorStoreWeaviate() as unknown as NodeWithPopulateVectorStore;
			const documents = [{ pageContent: 'hello', metadata: {} }];

			await node.populateVectorStore(
				buildContext(undefined, { jsonSchema: JSON.stringify(jsonSchemaObject) }),
				{},
				documents,
				0,
			);

			expect(hoisted.fromDocumentsSpy).toHaveBeenCalledTimes(1);
			const [, , config] = hoisted.fromDocumentsSpy.mock.calls[0] as [
				unknown,
				unknown,
				Record<string, unknown>,
			];
			expect(config.jsonSchema).toEqual(jsonSchemaObject);
		});

		it('passes an object jsonSchema through to fromDocuments unchanged', async () => {
			const node = new VectorStoreWeaviate() as unknown as NodeWithPopulateVectorStore;
			const documents = [{ pageContent: 'hello', metadata: {} }];

			await node.populateVectorStore(
				buildContext(undefined, { jsonSchema: jsonSchemaObject }),
				{},
				documents,
				0,
			);

			expect(hoisted.fromDocumentsSpy).toHaveBeenCalledTimes(1);
			const [, , config] = hoisted.fromDocumentsSpy.mock.calls[0] as [
				unknown,
				unknown,
				Record<string, unknown>,
			];
			expect(config.jsonSchema).toEqual(jsonSchemaObject);
		});

		it('leaves jsonSchema undefined when not provided', async () => {
			const node = new VectorStoreWeaviate() as unknown as NodeWithPopulateVectorStore;
			const documents = [{ pageContent: 'hello', metadata: {} }];

			await node.populateVectorStore(buildContext(undefined), {}, documents, 0);

			expect(hoisted.fromDocumentsSpy).toHaveBeenCalledTimes(1);
			const [, , config] = hoisted.fromDocumentsSpy.mock.calls[0] as [
				unknown,
				unknown,
				Record<string, unknown>,
			];
			expect(config.jsonSchema).toBeUndefined();
		});
	});
});

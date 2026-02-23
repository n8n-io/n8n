import type { QdrantLibArgs } from '@langchain/qdrant';
import { QdrantVectorStore } from '@langchain/qdrant';
import { type Schemas as QdrantSchemas } from '@qdrant/js-client-rest';
import { assertParamIsString, type INodeProperties } from 'n8n-workflow';

import { createQdrantClient, type QdrantCredential } from './Qdrant.utils';
import {
	createVectorStoreNode,
	BaseVectorStore,
	LangchainVectorStoreAdapter,
	type VectorStoreDocument,
	type VectorStoreSearchResult,
	type VectorStoreConfig,
	toLcDocument,
	fromLcDocument,
} from '@n8n/ai-utilities';
import { qdrantCollectionsSearch } from '../shared/methods/listSearch';
import { qdrantCollectionRLC } from '../shared/descriptions';

class QdrantVectorStoreWrapper extends BaseVectorStore {
	constructor(
		private langchainStore: QdrantVectorStore,
		collectionName: string,
	) {
		super('qdrant', collectionName);
	}

	async addDocuments(
		documents: VectorStoreDocument[],
		_config?: VectorStoreConfig,
	): Promise<string[]> {
		const lcDocs = documents.map(toLcDocument);

		await this.langchainStore.addDocuments(lcDocs);

		return lcDocs.map((doc) => doc.id ?? '');
	}

	async similaritySearch(
		_query: string,
		embeddings: number[],
		config?: VectorStoreConfig,
	): Promise<VectorStoreSearchResult[]> {
		const mergedConfig = this.mergeConfig(config);
		const k = mergedConfig.topK ?? 4;

		const results = await this.langchainStore.similaritySearchVectorWithScore(
			embeddings,
			k,
			mergedConfig.filter,
		);

		return results.map(([doc, score]) => ({
			document: fromLcDocument(doc),
			score,
		}));
	}

	async deleteDocuments(ids: string[], _config?: VectorStoreConfig): Promise<void> {
		await this.langchainStore.delete({ ids });
	}

	async addVectors(
		vectors: number[][],
		documents: VectorStoreDocument[],
		_config?: VectorStoreConfig,
	): Promise<string[]> {
		const lcDocs = documents.map(toLcDocument);

		await this.langchainStore.addVectors(vectors, lcDocs);

		return lcDocs.map((doc) => doc.id ?? '');
	}
}

const sharedFields: INodeProperties[] = [qdrantCollectionRLC];

const sharedOptions: INodeProperties[] = [
	{
		displayName: 'Content Payload Key',
		name: 'contentPayloadKey',
		type: 'string',
		default: 'content',
		description: 'The key to use for the content payload in Qdrant. Default is "content".',
	},
	{
		displayName: 'Metadata Payload Key',
		name: 'metadataPayloadKey',
		type: 'string',
		default: 'metadata',
		description: 'The key to use for the metadata payload in Qdrant. Default is "metadata".',
	},
];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Collection Config',
				name: 'collectionConfig',
				type: 'json',
				default: '',
				description:
					'JSON options for creating a collection. <a href="https://qdrant.tech/documentation/concepts/collections">Learn more</a>.',
			},
			...sharedOptions,
		],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Search Filter',
				name: 'searchFilterJson',
				type: 'json',
				typeOptions: {
					rows: 5,
				},
				default:
					'{\n  "should": [\n    {\n      "key": "metadata.batch",\n      "match": {\n        "value": 12345\n      }\n    }\n  ]\n}',
				validateType: 'object',
				description:
					'Filter pageContent or metadata using this <a href="https://qdrant.tech/documentation/concepts/filtering/" target="_blank">filtering syntax</a>',
			},
			...sharedOptions,
		],
	},
];

export class VectorStoreQdrantTest extends createVectorStoreNode<LangchainVectorStoreAdapter>({
	meta: {
		displayName: 'Qdrant Vector Store TEST',
		name: 'vectorStoreQdrantTest',
		description: 'Work with your data in a Qdrant collection (using new adapter pattern)',
		icon: 'file:qdrant.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreqdrant/',
		credentials: [
			{
				name: 'qdrantApi',
				required: true,
			},
		],
	},
	methods: { listSearch: { qdrantCollectionsSearch } },
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const collection = context.getNodeParameter('qdrantCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const contentPayloadKey = context.getNodeParameter('options.contentPayloadKey', itemIndex, '');
		assertParamIsString('contentPayloadKey', contentPayloadKey, context.getNode());

		const metadataPayloadKey = context.getNodeParameter(
			'options.metadataPayloadKey',
			itemIndex,
			'',
		);
		assertParamIsString('metadataPayloadKey', metadataPayloadKey, context.getNode());

		const credentials = await context.getCredentials('qdrantApi');

		const client = createQdrantClient(credentials as QdrantCredential);

		const config: QdrantLibArgs = {
			client,
			collectionName: collection,
			contentPayloadKey: contentPayloadKey !== '' ? contentPayloadKey : undefined,
			metadataPayloadKey: metadataPayloadKey !== '' ? metadataPayloadKey : undefined,
		};

		// Create LangChain store
		const langchainStore = await QdrantVectorStore.fromExistingCollection(embeddings, config);

		// Wrap it with our VectorStore implementation
		const wrapper = new QdrantVectorStoreWrapper(langchainStore, collection);

		// Set the filter in the wrapper's default config (replaces ExtendedQdrantVectorStore pattern)
		if (filter) {
			wrapper.defaultConfig = { filter };
		}

		// Wrap in our adapter to get LangChain-compatible interface
		const adapter = new LangchainVectorStoreAdapter(wrapper, embeddings, context);

		return adapter;
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('qdrantCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const contentPayloadKey = context.getNodeParameter('options.contentPayloadKey', itemIndex, '');
		assertParamIsString('contentPayloadKey', contentPayloadKey, context.getNode());

		const metadataPayloadKey = context.getNodeParameter(
			'options.metadataPayloadKey',
			itemIndex,
			'',
		);
		assertParamIsString('metadataPayloadKey', metadataPayloadKey, context.getNode());

		const { collectionConfig } = context.getNodeParameter('options', itemIndex, {}) as {
			collectionConfig?: QdrantSchemas['CreateCollection'];
		};
		const credentials = await context.getCredentials('qdrantApi');

		const client = createQdrantClient(credentials as QdrantCredential);

		const config: QdrantLibArgs = {
			client,
			collectionName,
			collectionConfig,
			contentPayloadKey: contentPayloadKey !== '' ? contentPayloadKey : undefined,
			metadataPayloadKey: metadataPayloadKey !== '' ? metadataPayloadKey : undefined,
		};

		// Create LangChain store
		const langchainStore = await QdrantVectorStore.fromDocuments(documents, embeddings, config);

		// Wrap it with our VectorStore implementation
		const wrapper = new QdrantVectorStoreWrapper(langchainStore, collectionName);

		// Use wrapper to add documents (demonstrates our pattern)
		await wrapper.addDocuments(documents);
	},
}) {}

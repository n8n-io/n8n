import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { Embeddings } from '@langchain/core/embeddings';
import type { QdrantLibArgs } from '@langchain/qdrant';
import { QdrantVectorStore } from '@langchain/qdrant';
import { type Schemas as QdrantSchemas } from '@qdrant/js-client-rest';
import { assertParamIsString, type IDataObject, type INodeProperties } from 'n8n-workflow';

import { createQdrantClient, type QdrantCredential } from './Qdrant.utils';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { qdrantCollectionsSearch } from '../shared/createVectorStoreNode/methods/listSearch';
import { qdrantCollectionRLC } from '../shared/descriptions';

class ExtendedQdrantVectorStore extends QdrantVectorStore {
	private static defaultFilter: IDataObject = {};

	static async fromExistingCollection(
		embeddings: Embeddings,
		args: QdrantLibArgs,
		defaultFilter: IDataObject = {},
	): Promise<QdrantVectorStore> {
		ExtendedQdrantVectorStore.defaultFilter = defaultFilter;
		return await super.fromExistingCollection(embeddings, args);
	}

	async similaritySearch(query: string, k: number, filter?: IDataObject, callbacks?: Callbacks) {
		const mergedFilter = { ...ExtendedQdrantVectorStore.defaultFilter, ...filter };
		return await super.similaritySearch(query, k, mergedFilter, callbacks);
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

export class VectorStoreQdrant extends createVectorStoreNode<ExtendedQdrantVectorStore>({
	meta: {
		displayName: 'Qdrant Vector Store',
		name: 'vectorStoreQdrant',
		description: 'Work with your data in a Qdrant collection',
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

		return await ExtendedQdrantVectorStore.fromExistingCollection(embeddings, config, filter);
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

		// If collection config is not provided, the collection will be created with default settings
		// i.e. with the size of the passed embeddings and "Cosine" distance metric
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

		await QdrantVectorStore.fromDocuments(documents, embeddings, config);
	},
}) {}

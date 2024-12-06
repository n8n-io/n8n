import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { QdrantLibArgs } from '@langchain/qdrant';
import { QdrantVectorStore } from '@langchain/qdrant';
import type { Schemas as QdrantSchemas } from '@qdrant/js-client-rest';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { qdrantCollectionRLC } from '../shared/descriptions';
import { qdrantCollectionsSearch } from '../shared/methods/listSearch';
import type { Embeddings } from '@langchain/core/embeddings';
import type { Callbacks } from '@langchain/core/callbacks/manager';

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

	async similaritySearch(
		query: string,
		k: number,
		filter?: IDataObject,
		callbacks?: Callbacks | undefined,
	) {
		const mergedFilter = { ...ExtendedQdrantVectorStore.defaultFilter, ...filter };
		return await super.similaritySearch(query, k, mergedFilter, callbacks);
	}
}

const searchFilter: INodeProperties = {
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
}

const sharedFields: INodeProperties[] = [qdrantCollectionRLC];

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
		options: [searchFilter],
	},
];

const deleteFields: INodeProperties[] = [
	{
		displayName: 'Delete Method',
		name: 'deleteMethod',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Delete by ID',
				value: 'id',
			},
			{
				name: 'Delete by Filter',
				value: 'filter',
			},
		],
		default: 'id',
		description: 'Choose the method to delete entries',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of an embedding entry',
		displayOptions: { show: { deleteMethod: ['id'] } },
	},
	{
		...searchFilter,
		displayOptions: { show: { deleteMethod: ['filter'] } },
	},
];

export class VectorStoreQdrant extends createVectorStoreNode({
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
		operationModes: ['load', 'insert', 'retrieve', 'delete'],
	},
	methods: { listSearch: { qdrantCollectionsSearch } },
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	retrieveFields,
	deleteFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const collection = context.getNodeParameter('qdrantCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const credentials = await context.getCredentials('qdrantApi');

		const config: QdrantLibArgs = {
			url: credentials.qdrantUrl as string,
			apiKey: credentials.apiKey as string,
			collectionName: collection,
		};

		return await ExtendedQdrantVectorStore.fromExistingCollection(embeddings, config, filter);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('qdrantCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		// If collection config is not provided, the collection will be created with default settings
		// i.e. with the size of the passed embeddings and "Cosine" distance metric
		const { collectionConfig } = context.getNodeParameter('options', itemIndex, {}) as {
			collectionConfig?: QdrantSchemas['CreateCollection'];
		};
		const credentials = await context.getCredentials('qdrantApi');

		const config: QdrantLibArgs = {
			url: credentials.qdrantUrl as string,
			apiKey: credentials.apiKey as string,
			collectionName,
			collectionConfig,
		};

		await QdrantVectorStore.fromDocuments(documents, embeddings, config);
	},
}) {}

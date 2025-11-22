import { Milvus } from '@langchain/community/vectorstores/milvus';
import type { IndexCreateOptions, MilvusLibArgs } from '@langchain/community/vectorstores/milvus';
import { IndexType, MetricType, MilvusClient } from '@zilliz/milvus2-sdk-node';
import type { INodeProperties } from 'n8n-workflow';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { milvusCollectionsSearch } from '../shared/createVectorStoreNode/methods/listSearch';
import { milvusCollectionRLC } from '../shared/descriptions';

const sharedFields: INodeProperties[] = [milvusCollectionRLC];

const distanceStrategyField: INodeProperties = {
	displayName: 'Distance Strategy',
	name: 'distanceStrategy',
	type: 'options',
	default: MetricType.L2,
	description: 'The method to calculate the distance between two vectors',
	options: Object.values(MetricType).map((m) => ({ name: m, value: m })),
};

const indexTypeField: INodeProperties = {
	displayName: 'Index Type',
	name: 'indexType',
	type: 'options',
	default: IndexType.AUTOINDEX,
	description: 'The type of index used in the Milvus database',
	options: Object.values(IndexType).map((i) => ({ name: i, value: i })),
};

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Clear Collection',
				name: 'clearCollection',
				type: 'boolean',
				default: false,
				description: 'Whether to clear the collection before inserting new data',
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
		options: [distanceStrategyField, indexTypeField],
	},
];

export class VectorStoreMilvus extends createVectorStoreNode<Milvus>({
	meta: {
		displayName: 'Milvus Vector Store',
		name: 'vectorStoreMilvus',
		description: 'Work with your data in Milvus Vector Store',
		icon: { light: 'file:milvus-icon-black.svg', dark: 'file:milvus-icon-white.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoremilvus/',
		credentials: [
			{
				name: 'milvusApi',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	methods: { listSearch: { milvusCollectionsSearch } },
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, _filter, embeddings, itemIndex): Promise<Milvus> {
		const collection = context.getNodeParameter('milvusCollection', itemIndex, '', {
			extractValue: true,
		}) as string;
		const credentials = await context.getCredentials<{
			baseUrl: string;
			username: string;
			password: string;
			databaseName: string;
		}>('milvusApi');
		const indexCreateOptions: IndexCreateOptions = {
			index_type: context.getNodeParameter('options.indexType', itemIndex, IndexType.AUTOINDEX),
			metric_type: context.getNodeParameter('options.distanceStrategy', itemIndex, MetricType.L2),
		};
		const config: MilvusLibArgs = {
			url: credentials.baseUrl,
			username: credentials.username,
			password: credentials.password,
			collectionName: collection,
			indexCreateOptions: indexCreateOptions,
			clientConfig: {
				address: credentials.baseUrl,
				database: credentials.databaseName ?? 'default',
			},
		};

		return await Milvus.fromExistingCollection(embeddings, config);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex): Promise<void> {
		const collection = context.getNodeParameter('milvusCollection', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			clearCollection?: boolean;
		};
		const credentials = await context.getCredentials<{
			baseUrl: string;
			username: string;
			password: string;
			databaseName: string;
		}>('milvusApi');
		const config: MilvusLibArgs = {
			url: credentials.baseUrl,
			username: credentials.username,
			password: credentials.password,
			collectionName: collection,
			clientConfig: {
				address: credentials.baseUrl,
				database: credentials.databaseName ?? 'default',
			},
		};

		if (options.clearCollection) {
			const client = new MilvusClient({
				address: credentials.baseUrl,
				token: `${credentials.username}:${credentials.password}`,
				database: credentials.databaseName ?? 'default',
			});
			await client.dropCollection({ collection_name: collection });
		}

		await Milvus.fromDocuments(documents, embeddings, config);
	},
}) {}

import { Milvus } from '@langchain/community/vectorstores/milvus';
import type { IndexCreateOptions, MilvusLibArgs } from '@langchain/community/vectorstores/milvus';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import type { INodeProperties } from 'n8n-workflow';

import { createVectorStoreNode } from '@n8n/ai-utilities';
import { milvusCollectionsSearch } from '../shared/methods/listSearch';
import { milvusCollectionRLC } from '../shared/descriptions';

const sharedFields: INodeProperties[] = [milvusCollectionRLC];

const distanceStrategyField: INodeProperties = {
	displayName: 'Distance Strategy',
	name: 'distanceStrategy',
	type: 'options',
	default: 'L2',
	description: 'The method to calculate the distance between two vectors',
	options: [
		{ name: 'BM25', value: 'BM25' },
		{ name: 'COSINE', value: 'COSINE' },
		{ name: 'HAMMING', value: 'HAMMING' },
		{ name: 'IP', value: 'IP' },
		{ name: 'JACCARD', value: 'JACCARD' },
		{ name: 'L2', value: 'L2' },
		{ name: 'SUBSTRUCTURE', value: 'SUBSTRUCTURE' },
		{ name: 'SUPERSTRUCTURE', value: 'SUPERSTRUCTURE' },
		{ name: 'TANIMOTO', value: 'TANIMOTO' },
	],
};

const indexTypeField: INodeProperties = {
	displayName: 'Index Type',
	name: 'indexType',
	type: 'options',
	default: 'AUTOINDEX',
	description: 'The type of index used in the Milvus database',
	options: [
		{ name: 'AUTOINDEX', value: 'AUTOINDEX' },
		{ name: 'BIN_FLAT', value: 'BIN_FLAT' },
		{ name: 'BIN_IVF_FLAT', value: 'BIN_IVF_FLAT' },
		{ name: 'DISKANN', value: 'DISKANN' },
		{ name: 'FLAT', value: 'FLAT' },
		{ name: 'HNSW', value: 'HNSW' },
		{ name: 'IVF_FLAT', value: 'IVF_FLAT' },
		{ name: 'IVF_PQ', value: 'IVF_PQ' },
		{ name: 'IVF_SQ8', value: 'IVF_SQ8' },
		{ name: 'SCANN', value: 'SCANN' },
		{ name: 'SPARSE_INVERTED_INDEX', value: 'SPARSE_INVERTED_INDEX' },
		{ name: 'SPARSE_WAND', value: 'SPARSE_WAND' },
	],
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
		const database = credentials.databaseName?.trim() || 'default';
		const indexCreateOptions = {
			index_type: context.getNodeParameter('options.indexType', itemIndex, 'AUTOINDEX') as string,
			metric_type: context.getNodeParameter('options.distanceStrategy', itemIndex, 'L2') as string,
		} as IndexCreateOptions;
		const config: MilvusLibArgs = {
			url: credentials.baseUrl,
			username: credentials.username,
			password: credentials.password,
			collectionName: collection,
			indexCreateOptions,
			clientConfig: {
				address: credentials.baseUrl,
				database,
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
		const database = credentials.databaseName?.trim() || 'default';
		const config: MilvusLibArgs = {
			url: credentials.baseUrl,
			username: credentials.username,
			password: credentials.password,
			collectionName: collection,
			clientConfig: {
				address: credentials.baseUrl,
				database,
			},
		};

		if (options.clearCollection) {
			const client = new MilvusClient({
				address: credentials.baseUrl,
				token: `${credentials.username}:${credentials.password}`,
				database,
			});
			await client.dropCollection({ collection_name: collection });
		}

		await Milvus.fromDocuments(documents, embeddings, config);
	},
}) {}

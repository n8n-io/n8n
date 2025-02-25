import type { MilvusLibArgs } from './milvus';
import { MilvusVectorStore } from './milvus';

import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { Embeddings } from '@langchain/core/embeddings';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { milvusCollectionRLC } from '../shared/descriptions';
import { milvusCollectionSearch } from '../shared/methods/listSearch';

class ExtendedMilvusVectorStore extends MilvusVectorStore {
	private static defaultFilter: IDataObject = {};

	static async fromExistingCollection(
		embeddings: Embeddings,
		args: MilvusLibArgs,
		defaultFilter: IDataObject = {},
	): Promise<MilvusVectorStore> {
		ExtendedMilvusVectorStore.defaultFilter = defaultFilter;
		return await super.fromExistingCollection(embeddings, args);
	}

	async similaritySearch(
		query: string,
		k: number,
		filter?: string,
		callbacks?: Callbacks | undefined,
	) {
		const { filter: defaultFilterStr } = ExtendedMilvusVectorStore.defaultFilter ?? {};
		const mergedFilterStr = [defaultFilterStr, filter].filter(Boolean).join(' AND ');
		return await super.similaritySearch(query, k, mergedFilterStr, callbacks);
	}
}

const sharedFields: INodeProperties[] = [milvusCollectionRLC];

// https://milvus.io/docs/filtered-search.md
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
				default: '{\n  "filter": ""\n}',
				validateType: 'object',
				description:
					'Filter pageContent or metadata using this <a href="https://milvus.io/docs/filtered-search.md" target="_blank">filtered search</a>',
			},
		],
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
					'JSON options for creating a collection. <a href="https://milvus.io/api-reference/node/v2.5.x/Collections/createCollection.md">Learn more</a>.',
			},
		],
	},
];

export class VectorStoreMilvus extends createVectorStoreNode<MilvusVectorStore>({
	meta: {
		displayName: 'Milvus Vector Store',
		name: 'vectorStoreMilvus',
		description: 'Work with your data in Milvus Vector Store',
		icon: { light: 'file:milvus.svg', dark: 'file:milvus.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoremilvus/',
		credentials: [
			{
				name: 'milvusApi',
				required: true,
			},
		],
	},
	methods: { listSearch: { milvusCollectionSearch } },
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const collection = context.getNodeParameter('milvusCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const credentials = await context.getCredentials('milvusApi');

		const config: MilvusLibArgs = {
			url: credentials.milvusUrl as string,
			token: credentials.apiKey as string,
			collectionName: collection,
		};

		return await ExtendedMilvusVectorStore.fromExistingCollection(embeddings, config, filter);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('milvusCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = context.getNodeParameter('options', itemIndex, {});
		const credentials = await context.getCredentials('milvusApi');

		const config: MilvusLibArgs = {
			url: credentials.milvusUrl as string,
			token: credentials.apiKey as string,
			collectionName,
			...options,
		};

		await MilvusVectorStore.fromDocuments(documents, embeddings, config);
	},
}) {}

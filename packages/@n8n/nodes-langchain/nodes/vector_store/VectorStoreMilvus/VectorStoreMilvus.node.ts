import { Milvus } from '@langchain/community/vectorstores/milvus';
import type { MilvusLibArgs } from '@langchain/community/vectorstores/milvus';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import type { INodeProperties } from 'n8n-workflow';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { milvusCollectionsSearch } from '../shared/createVectorStoreNode/methods/listSearch';
import { milvusCollectionRLC } from '../shared/descriptions';

const sharedFields: INodeProperties[] = [milvusCollectionRLC];
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
	async getVectorStoreClient(context, _filter, embeddings, itemIndex): Promise<Milvus> {
		const collection = context.getNodeParameter('milvusCollection', itemIndex, '', {
			extractValue: true,
		}) as string;
		const credentials = await context.getCredentials<{
			baseUrl: string;
			username: string;
			password: string;
		}>('milvusApi');
		const config: MilvusLibArgs = {
			url: credentials.baseUrl,
			username: credentials.username,
			password: credentials.password,
			collectionName: collection,
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
		}>('milvusApi');
		const config: MilvusLibArgs = {
			url: credentials.baseUrl,
			username: credentials.username,
			password: credentials.password,
			collectionName: collection,
		};

		if (options.clearCollection) {
			const client = new MilvusClient({
				address: credentials.baseUrl,
				token: `${credentials.username}:${credentials.password}`,
			});
			await client.dropCollection({ collection_name: collection });
		}

		await Milvus.fromDocuments(documents, embeddings, config);
	},
}) {}

import type { INodeProperties } from 'n8n-workflow';
import type { PineconeLibArgs } from 'langchain/vectorstores/pinecone';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { metadataFilterField } from '../../../utils/sharedFields';

const sharedFields: INodeProperties[] = [
	{
		displayName: 'Pinecone Index',
		name: 'pineconeIndex',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Pinecone Namespace',
		name: 'pineconeNamespace',
		type: 'string',
		default: '',
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [metadataFilterField],
	},
];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Clear Namespace',
		name: 'clearNamespace',
		type: 'boolean',
		default: false,
		description: 'Whether to clear the namespace before inserting new data',
	},
];
export const VectorStorePinecone = createVectorStoreNode({
	meta: {
		displayName: 'Pinecone Vector Store',
		name: 'vectorStorePinecone',
		description: 'Work with your data in Pinecone Vector Store',
		icon: 'file:pinecone.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.vectorstorepineconeload/',
		credentials: [
			{
				name: 'pineconeApi',
				required: true,
			},
		],
	},
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const namespace = context.getNodeParameter('pineconeNamespace', itemIndex) as string;
		const index = context.getNodeParameter('pineconeIndex', itemIndex) as string;
		const credentials = await context.getCredentials('pineconeApi');

		const client = new Pinecone({
			apiKey: credentials.apiKey as string,
			environment: credentials.environment as string,
		});

		const pineconeIndex = client.Index(index);
		const config: PineconeLibArgs = {
			namespace: namespace || undefined,
			pineconeIndex,
			filter,
		};

		return PineconeStore.fromExistingIndex(embeddings, config);
	},
	async populateVectorStore(context, embeddings, documents) {
		const namespace = context.getNodeParameter('pineconeNamespace', 0) as string;
		const index = context.getNodeParameter('pineconeIndex', 0) as string;
		const clearNamespace = context.getNodeParameter('clearNamespace', 0) as boolean;
		const credentials = await context.getCredentials('pineconeApi');

		const client = new Pinecone({
			apiKey: credentials.apiKey as string,
			environment: credentials.environment as string,
		});

		const pineconeIndex = client.Index(index);

		if (namespace && clearNamespace) {
			await pineconeIndex.namespace(namespace).deleteAll();
		}

		await PineconeStore.fromDocuments(documents, embeddings, {
			namespace: namespace || undefined,
			pineconeIndex,
		});
	},
});

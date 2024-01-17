import { NodeOperationError, type INodeProperties } from 'n8n-workflow';
import type { PineconeLibArgs } from 'langchain/vectorstores/pinecone';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { metadataFilterField } from '../../../utils/sharedFields';
import { pineconeIndexRLC } from '../shared/descriptions';
import { pineconeIndexSearch } from '../shared/methods/listSearch';

const sharedFields: INodeProperties[] = [pineconeIndexRLC];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Pinecone Namespace',
				name: 'pineconeNamespace',
				type: 'string',
				description:
					'Partition the records in an index into namespaces. Queries and other operations are then limited to one namespace, so different requests can search different subsets of your index.',
				default: '',
			},
			metadataFilterField,
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
				displayName: 'Clear Namespace',
				name: 'clearNamespace',
				type: 'boolean',
				default: false,
				description: 'Whether to clear the namespace before inserting new data',
			},
			{
				displayName: 'Pinecone Namespace',
				name: 'pineconeNamespace',
				type: 'string',
				description:
					'Partition the records in an index into namespaces. Queries and other operations are then limited to one namespace, so different requests can search different subsets of your index.',
				default: '',
			},
		],
	},
];
export const VectorStorePinecone = createVectorStoreNode({
	meta: {
		displayName: 'Pinecone Vector Store',
		name: 'vectorStorePinecone',
		description: 'Work with your data in Pinecone Vector Store',
		icon: 'file:pinecone.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorepinecone/',
		credentials: [
			{
				name: 'pineconeApi',
				required: true,
			},
		],
	},
	methods: { listSearch: { pineconeIndexSearch } },
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const index = context.getNodeParameter('pineconeIndex', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			pineconeNamespace?: string;
		};
		const credentials = await context.getCredentials('pineconeApi');

		const client = new Pinecone({
			apiKey: credentials.apiKey as string,
			environment: credentials.environment as string,
		});

		const pineconeIndex = client.Index(index);
		const config: PineconeLibArgs = {
			namespace: options.pineconeNamespace ?? undefined,
			pineconeIndex,
			filter,
		};

		return await PineconeStore.fromExistingIndex(embeddings, config);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const index = context.getNodeParameter('pineconeIndex', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			pineconeNamespace?: string;
			clearNamespace?: boolean;
		};
		const credentials = await context.getCredentials('pineconeApi');

		const client = new Pinecone({
			apiKey: credentials.apiKey as string,
			environment: credentials.environment as string,
		});

		const indexes = (await client.listIndexes()).map((i) => i.name);

		if (!indexes.includes(index)) {
			throw new NodeOperationError(context.getNode(), `Index ${index} not found`, {
				itemIndex,
				description: 'Please check that the index exists in your vector store',
			});
		}

		const pineconeIndex = client.Index(index);

		if (options.pineconeNamespace && options.clearNamespace) {
			await pineconeIndex.namespace(options.pineconeNamespace).deleteAll();
		}

		await PineconeStore.fromDocuments(documents, embeddings, {
			namespace: options.pineconeNamespace ?? undefined,
			pineconeIndex,
		});
	},
});

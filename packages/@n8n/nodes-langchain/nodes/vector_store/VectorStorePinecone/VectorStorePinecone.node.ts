import type { VectorStore } from '@langchain/core/vectorstores';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { NodeOperationError, type INodeProperties } from 'n8n-workflow';

import { metadataFilterField, createVectorStoreNode } from '@n8n/ai-utilities';

import { pineconeIndexSearch } from '../shared/methods/listSearch';
import { pineconeIndexRLC } from '../shared/descriptions';
import { assertPineconeIndexAcceptsVectors, getPineconeVectorStore } from '../shared/pinecone';

const sharedFields: INodeProperties[] = [pineconeIndexRLC];

const pineconeNamespaceField: INodeProperties = {
	displayName: 'Pinecone Namespace',
	name: 'pineconeNamespace',
	type: 'string',
	description:
		'Partition the records in an index into namespaces. Queries and other operations are then limited to one namespace, so different requests can search different subsets of your index.',
	default: '',
};

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			pineconeNamespaceField,
			metadataFilterField,
			{
				displayName: 'Text Field',
				name: 'textField',
				type: 'string',
				default: '',
				description:
					'For an index with a document schema: the document field that holds the text. Leave empty to use the "text" field, or else the first text field.',
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
				displayName: 'Clear Namespace',
				name: 'clearNamespace',
				type: 'boolean',
				default: false,
				description: 'Whether to clear the namespace before inserting new data',
			},
			pineconeNamespaceField,
		],
	},
];

export class VectorStorePinecone extends createVectorStoreNode<VectorStore>({
	meta: {
		displayName: 'Pinecone Vector Store',
		name: 'vectorStorePinecone',
		description: 'Work with your data in Pinecone Vector Store',
		icon: { light: 'file:pinecone.svg', dark: 'file:pinecone.dark.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorepinecone/',
		credentials: [
			{
				name: 'pineconeApi',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: { listSearch: { pineconeIndexSearch } },
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	// Document indexes with integrated embedding need the query text. Classic indexes embed
	// it with the connected model, as before
	searchByText: true,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const index = context.getNodeParameter('pineconeIndex', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			pineconeNamespace?: string;
			textField?: string;
		};
		const credentials = await context.getCredentials('pineconeApi');

		return await getPineconeVectorStore(
			{ context, credentialType: 'pineconeApi', apiKey: credentials.apiKey as string },
			embeddings,
			{
				indexName: index,
				namespace: options.pineconeNamespace ?? undefined,
				filter,
				textField: options.textField,
			},
		);
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
		});

		const indexes = ((await client.listIndexes()).indexes ?? []).map((i) => i.name);

		if (!indexes.includes(index)) {
			throw new NodeOperationError(context.getNode(), `Index ${index} not found`, {
				itemIndex,
				description: 'Please check that the index exists in your vector store',
			});
		}

		await assertPineconeIndexAcceptsVectors(
			{ context, credentialType: 'pineconeApi', apiKey: credentials.apiKey as string },
			index,
		);
		const pineconeIndex = client.Index(index);

		if (options.pineconeNamespace && options.clearNamespace) {
			const namespace = pineconeIndex.namespace(options.pineconeNamespace);
			try {
				await namespace.deleteAll();
			} catch (error) {
				// Namespace doesn't exist yet
				context.logger.info(`Namespace ${options.pineconeNamespace} does not exist yet`);
			}
		}

		await PineconeStore.fromDocuments(documents, embeddings, {
			namespace: options.pineconeNamespace ?? undefined,
			pineconeIndex,
		});
	},
}) {}

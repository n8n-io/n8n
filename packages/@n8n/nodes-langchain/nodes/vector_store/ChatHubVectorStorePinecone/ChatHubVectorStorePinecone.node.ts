import type { Document } from '@langchain/core/documents';
import type { VectorStore } from '@langchain/core/vectorstores';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import { assertPineconeIndexAcceptsVectors, getPineconeVectorStore } from '../shared/pinecone';
import { getUserScopedSlot } from '../shared/userScoped';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';
import {
	filterChatHubMetadata,
	filterChatHubInsertDocuments,
	CHAT_HUB_RETRIEVE_METADATA_KEYS,
} from '../shared/chatHub';

type ChatHubVectorStorePineconeApiCredentials = {
	apiKey: string;
	pineconeIndex: string;
	namespacePrefix: string;
};

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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [],
	},
];

async function chatHubVectorStorePineconeApiConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as ChatHubVectorStorePineconeApiCredentials;

	try {
		const client = new Pinecone({ apiKey: credentials.apiKey });
		const indexes = ((await client.listIndexes()).indexes ?? []).map((i) => i.name);

		if (!indexes.includes(credentials.pineconeIndex)) {
			return {
				status: 'Error',
				message: `Index "${credentials.pineconeIndex}" not found. Please create the index first or check the index name.`,
			};
		}
	} catch (error) {
		return {
			status: 'Error',
			message: error.message as string,
		};
	}

	return {
		status: 'OK',
		message: 'Connection successful',
	};
}

async function deleteDocuments(
	this: ILoadOptionsFunctions,
	payload: IDataObject | string | undefined,
): Promise<NodeParameterValueType> {
	const { filter } = (typeof payload === 'string' ? jsonParse(payload) : (payload ?? {})) as {
		filter?: Record<string, string | string[]>;
	};

	const credentials = await this.getCredentials<ChatHubVectorStorePineconeApiCredentials>(
		'chatHubVectorStorePineconeApi',
	);
	const namespaceName = getUserScopedSlot(this, credentials.namespacePrefix);

	const client = new Pinecone({ apiKey: credentials.apiKey });
	const pineconeIndex = client.Index(credentials.pineconeIndex);
	const namespace = pineconeIndex.namespace(namespaceName);

	if (!filter || Object.keys(filter).length === 0) {
		// The namespace is user-scoped (one namespace per user), so deleting all is safe
		// and avoids leaving empty ghost namespaces after user deletion.
		await namespace.deleteAll();
	} else {
		await namespace.deleteMany(filter);
	}

	return null;
}

export class ChatHubVectorStorePinecone extends createVectorStoreNode<VectorStore>({
	meta: {
		displayName: 'ChatHub Pinecone Vector Store',
		name: 'chatHubVectorStorePinecone',
		description: 'Internal-use vector store for ChatHub',
		icon: {
			light: 'file:../VectorStorePinecone/pinecone.svg',
			dark: 'file:../VectorStorePinecone/pinecone.dark.svg',
		},
		docsUrl: 'https://docs.n8n.io',
		credentials: [
			{
				name: 'chatHubVectorStorePineconeApi',
				required: true,
				testedBy: 'chatHubVectorStorePineconeApiConnectionTest',
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	hidden: true,
	methods: {
		credentialTest: { chatHubVectorStorePineconeApiConnectionTest },
		actionHandler: { deleteDocuments },
	},
	sharedFields: [],
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	// Document indexes with integrated embedding need the query text
	searchByText: true,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const credentials = await context.getCredentials<ChatHubVectorStorePineconeApiCredentials>(
			'chatHubVectorStorePineconeApi',
		);
		const namespaceName = getUserScopedSlot(context, credentials.namespacePrefix, itemIndex);

		const store = await getPineconeVectorStore(
			{
				context,
				credentialType: 'chatHubVectorStorePineconeApi',
				apiKey: credentials.apiKey,
			},
			embeddings,
			{
				indexName: credentials.pineconeIndex,
				namespace: namespaceName,
				filter,
			},
		);

		// Both entry points filter, because a document index with integrated embedding searches by
		// text only. The filter is idempotent, so a text search that delegates to the vector search is fine
		const sanitize = (results: Array<[Document, number]>): Array<[Document, number]> =>
			results.map(([doc, score]) => [
				{ ...doc, metadata: filterChatHubMetadata(doc.metadata, CHAT_HUB_RETRIEVE_METADATA_KEYS) },
				score,
			]);
		const vectorSearch = store.similaritySearchVectorWithScore.bind(store);
		store.similaritySearchVectorWithScore = async (...args) =>
			sanitize(await vectorSearch(...args));
		const textSearch = store.similaritySearchWithScore.bind(store);
		store.similaritySearchWithScore = async (...args) => sanitize(await textSearch(...args));

		return store;
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const credentials = await context.getCredentials<ChatHubVectorStorePineconeApiCredentials>(
			'chatHubVectorStorePineconeApi',
		);
		const namespaceName = getUserScopedSlot(context, credentials.namespacePrefix, itemIndex);

		const client = new Pinecone({ apiKey: credentials.apiKey });

		const indexes = ((await client.listIndexes()).indexes ?? []).map((i) => i.name);
		if (!indexes.includes(credentials.pineconeIndex)) {
			throw new NodeOperationError(
				context.getNode(),
				`Index ${credentials.pineconeIndex} not found`,
				{
					itemIndex,
					description: 'Please check that the index exists in your Pinecone account',
				},
			);
		}

		await assertPineconeIndexAcceptsVectors(
			{
				context,
				credentialType: 'chatHubVectorStorePineconeApi',
				apiKey: credentials.apiKey,
			},
			credentials.pineconeIndex,
		);
		const pineconeIndex = client.Index(credentials.pineconeIndex);

		await PineconeStore.fromDocuments(filterChatHubInsertDocuments(documents), embeddings, {
			namespace: namespaceName,
			pineconeIndex,
		});
	},
}) {}

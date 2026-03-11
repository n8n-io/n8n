import type { PineconeStoreParams } from '@langchain/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import { getUserScopedSlot } from '../shared/userScoped';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';

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

export class ChatHubVectorStorePinecone extends createVectorStoreNode<PineconeStore>({
	meta: {
		displayName: 'ChatHub Pinecone Vector Store',
		name: 'chatHubVectorStorePinecone',
		description: 'Internal-use vector store for ChatHub',
		icon: { light: 'file:../VectorStorePinecone/pinecone.svg', dark: 'file:pinecone.dark.svg' },
		docsUrl: 'https://docs.n8n.io',
		credentials: [
			{
				name: 'chatHubVectorStorePineconeApi',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	hidden: true,
	methods: { actionHandler: { deleteDocuments } },
	sharedFields: [],
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const credentials = await context.getCredentials<ChatHubVectorStorePineconeApiCredentials>(
			'chatHubVectorStorePineconeApi',
		);
		const namespaceName = getUserScopedSlot(context, credentials.namespacePrefix, itemIndex);

		const client = new Pinecone({ apiKey: credentials.apiKey });
		const pineconeIndex = client.Index(credentials.pineconeIndex);

		const config: PineconeStoreParams = {
			namespace: namespaceName,
			pineconeIndex,
			filter,
		};

		return await PineconeStore.fromExistingIndex(embeddings, config);
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

		const pineconeIndex = client.Index(credentials.pineconeIndex);

		await PineconeStore.fromDocuments(documents, embeddings, {
			namespace: namespaceName,
			pineconeIndex,
		});
	},
}) {}

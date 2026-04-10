import type { QdrantLibArgs } from '@langchain/qdrant';
import { QdrantVectorStore } from '@langchain/qdrant';
import {
	jsonParse,
	type INodeProperties,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeCredentialTestResult,
	type NodeParameterValueType,
} from 'n8n-workflow';

import type { Callbacks } from '@langchain/core/callbacks/manager';
import { createQdrantClient, type QdrantCredential } from '../VectorStoreQdrant/Qdrant.utils';
import { ensureUserId } from '../shared/userScoped';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';
import {
	filterChatHubMetadata,
	filterChatHubInsertDocuments,
	CHAT_HUB_RETRIEVE_METADATA_KEYS,
} from '../shared/chatHub';

type ChatHubVectorStoreQdrantApiCredentials = QdrantCredential & {
	collectionName: string;
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

type Filter = QdrantVectorStore['FilterType'];

const INDEXED_PAYLOAD_FIELDS = [
	'metadata.userId',
	'metadata.agentId',
	'metadata.fileKnowledgeId',
] as const;

async function ensurePayloadIndexes(
	client: ReturnType<typeof createQdrantClient>,
	collectionName: string,
): Promise<void> {
	for (const fieldName of INDEXED_PAYLOAD_FIELDS) {
		await client.createPayloadIndex(collectionName, {
			field_name: fieldName,
			field_schema: 'keyword',
		});
	}
}

async function chatHubVectorStoreQdrantApiConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as ChatHubVectorStoreQdrantApiCredentials;

	try {
		const client = createQdrantClient(credentials);
		await client.getCollections();
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
	const { filter = {} } = (typeof payload === 'string' ? jsonParse(payload) : (payload ?? {})) as {
		filter?: Record<string, string | string[]>;
	};

	const credentials = await this.getCredentials<ChatHubVectorStoreQdrantApiCredentials>(
		'chatHubVectorStoreQdrantApi',
	);
	const userId = ensureUserId(this);
	const client = createQdrantClient(credentials);

	await ensurePayloadIndexes(client, credentials.collectionName);

	const must: Filter['must'] = [
		{ key: 'metadata.userId', match: { value: userId } },
		...Object.entries(filter).map(([key, value]) => {
			if (Array.isArray(value)) {
				return { key: `metadata.${key}`, match: { any: value } };
			}
			return { key: `metadata.${key}`, match: { value } };
		}),
	];

	this.logger.debug(`Deleting Qdrant vector store documents... Filter: ${JSON.stringify(must)}`);

	await client.delete(credentials.collectionName, { filter: { must } });

	return null;
}

export class ChatHubVectorStoreQdrant extends createVectorStoreNode<QdrantVectorStore>({
	meta: {
		displayName: 'ChatHub Qdrant Vector Store',
		name: 'chatHubVectorStoreQdrant',
		description: 'Internal-use vector store for ChatHub',
		icon: 'file:../VectorStoreQdrant/qdrant.svg',
		docsUrl: 'https://docs.n8n.io',
		credentials: [
			{
				name: 'chatHubVectorStoreQdrantApi',
				required: true,
				testedBy: 'chatHubVectorStoreQdrantApiConnectionTest',
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	hidden: true,
	methods: {
		credentialTest: { chatHubVectorStoreQdrantApiConnectionTest },
		actionHandler: { deleteDocuments },
	},
	sharedFields: [],
	insertFields: [],
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, _filter, embeddings) {
		const credentials = await context.getCredentials<ChatHubVectorStoreQdrantApiCredentials>(
			'chatHubVectorStoreQdrantApi',
		);
		const userId = ensureUserId(context);
		const client = createQdrantClient(credentials);
		const config: QdrantLibArgs = { client, collectionName: credentials.collectionName };

		const store = await QdrantVectorStore.fromExistingCollection(embeddings, config);

		await ensurePayloadIndexes(client, credentials.collectionName);
		const originalSearch = store.similaritySearch.bind(store);
		const originalSearchWithScore = store.similaritySearchWithScore.bind(store);
		const originalSearchVectorWithScore = store.similaritySearchVectorWithScore.bind(store);

		// In ChatHub, getVectorStoreClient is always called with filter=undefined.
		// The flat metadata filter (e.g. { agentId }) is passed directly to
		// similaritySearch* methods as anotherFilter instead (see retrieveAsToolOperation).
		function createFinalFilter(anotherFilter?: Filter): Filter {
			const anotherFilterMust = anotherFilter
				? Object.entries(anotherFilter).map(([key, value]) => ({
						key: `metadata.${key}`,
						match: { value },
					}))
				: [];

			const final = {
				must: [...anotherFilterMust, { key: 'metadata.userId', match: { value: userId } }],
			};

			context.logger.debug(`Querying Qdrant vector store... Filter: ${JSON.stringify(final)}`);

			return final;
		}

		store.similaritySearch = async (
			query: string,
			k?: number,
			f?: Filter,
			callbacks?: Callbacks,
		) => {
			const results = await originalSearch(query, k, createFinalFilter(f), callbacks);
			return results.map((doc) => ({
				...doc,
				metadata: filterChatHubMetadata(doc.metadata, CHAT_HUB_RETRIEVE_METADATA_KEYS),
			}));
		};

		store.similaritySearchWithScore = async (
			query: string,
			k?: number,
			f?: Filter,
			callbacks?: Callbacks,
		) => {
			const results = await originalSearchWithScore(query, k, createFinalFilter(f), callbacks);
			return results.map(([doc, score]) => [
				{ ...doc, metadata: filterChatHubMetadata(doc.metadata, CHAT_HUB_RETRIEVE_METADATA_KEYS) },
				score,
			]);
		};

		store.similaritySearchVectorWithScore = async (query: number[], k?: number, f?: Filter) => {
			const results = await originalSearchVectorWithScore(query, k, createFinalFilter(f));
			return results.map(([doc, score]) => [
				{ ...doc, metadata: filterChatHubMetadata(doc.metadata, CHAT_HUB_RETRIEVE_METADATA_KEYS) },
				score,
			]);
		};

		return store;
	},
	async populateVectorStore(context, embeddings, documents) {
		const credentials = await context.getCredentials<ChatHubVectorStoreQdrantApiCredentials>(
			'chatHubVectorStoreQdrantApi',
		);
		const userId = ensureUserId(context);
		const client = createQdrantClient(credentials);
		const config: QdrantLibArgs = { client, collectionName: credentials.collectionName };

		await QdrantVectorStore.fromDocuments(
			filterChatHubInsertDocuments(documents).map((d) => ({
				...d,
				metadata: { ...d.metadata, userId },
			})),
			embeddings,
			config,
		);

		await ensurePayloadIndexes(client, credentials.collectionName);
	},
}) {}

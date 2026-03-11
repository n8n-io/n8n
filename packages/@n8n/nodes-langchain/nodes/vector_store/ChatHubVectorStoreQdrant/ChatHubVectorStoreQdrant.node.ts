import type { QdrantLibArgs } from '@langchain/qdrant';
import { QdrantVectorStore } from '@langchain/qdrant';
import {
	jsonParse,
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
import { createVectorStoreNode } from '@n8n/ai-utilities';

type ChatHubVectorStoreQdrantApiCredentials = QdrantCredential & {
	collectionName: string;
};

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
	loadFields: [],
	retrieveFields: [],
	async getVectorStoreClient(context, filter, embeddings) {
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

		function createFinalFilter(anotherFilter?: Filter): Filter {
			const originalMust = anotherFilter
				? Array.isArray(anotherFilter.must)
					? anotherFilter.must
					: [anotherFilter.must ?? {}]
				: [];
			const must = filter ? (Array.isArray(filter.must) ? filter.must : [filter.must ?? {}]) : [];

			const final = {
				...anotherFilter,
				...filter,
				must: [...originalMust, ...must, { key: 'metadata.userId', match: { value: userId } }],
			};

			context.logger.debug(`Querying Qdrant vector store... Filter: ${JSON.stringify(final)}`);

			return final;
		}

		store.similaritySearch = async (query: string, k?: number, f?: Filter, callbacks?: Callbacks) =>
			await originalSearch(query, k, createFinalFilter(f), callbacks);

		store.similaritySearchWithScore = async (
			query: string,
			k?: number,
			f?: Filter,
			callbacks?: Callbacks,
		) => await originalSearchWithScore(query, k, createFinalFilter(f), callbacks);

		store.similaritySearchVectorWithScore = async (query: number[], k?: number, f?: Filter) =>
			await originalSearchVectorWithScore(query, k, createFinalFilter(f));

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
			documents.map((d) => ({ ...d, metadata: { ...d.metadata, userId } })),
			embeddings,
			config,
		);

		await ensurePayloadIndexes(client, credentials.collectionName);
	},
}) {}

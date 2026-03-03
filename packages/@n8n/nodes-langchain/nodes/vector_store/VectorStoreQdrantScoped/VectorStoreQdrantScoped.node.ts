import type { QdrantLibArgs } from '@langchain/qdrant';
import { QdrantVectorStore } from '@langchain/qdrant';
import {
	jsonParse,
	NodeOperationError,
	type IDataObject,
	type ILoadOptionsFunctions,
	type NodeParameterValueType,
} from 'n8n-workflow';

import type { Callbacks } from '@langchain/core/callbacks/manager';
import { createQdrantClient, type QdrantCredential } from '../VectorStoreQdrant/Qdrant.utils';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { ensureUserId } from '../shared/userScoped';

type VectorStoreQdrantScopedApiCredentials = QdrantCredential & {
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

async function deleteDocuments(
	this: ILoadOptionsFunctions,
	payload: IDataObject | string | undefined,
): Promise<NodeParameterValueType> {
	const { filter } = (typeof payload === 'string' ? jsonParse(payload) : (payload ?? {})) as {
		filter: Record<string, string | string[]>;
	};

	if (!filter || Object.keys(filter).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'deleteDocuments requires at least one filter field.',
		);
	}

	const credentials = await this.getCredentials<VectorStoreQdrantScopedApiCredentials>(
		'vectorStoreQdrantScopedApi',
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

export class VectorStoreQdrantScoped extends createVectorStoreNode<QdrantVectorStore>({
	meta: {
		displayName: 'Qdrant Vector Store (User-Scoped)',
		name: 'vectorStoreQdrantScoped',
		description:
			'Work with your data in a Qdrant collection, scoped per user via userId metadata field',
		icon: 'file:qdrant.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreqdrant/',
		credentials: [
			{
				name: 'vectorStoreQdrantScopedApi',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	hidden: true,
	methods: { actionHandler: { deleteDocuments } },
	sharedFields: [],
	insertFields: [],
	loadFields: [],
	retrieveFields: [],
	async getVectorStoreClient(context, filter, embeddings) {
		const credentials = await context.getCredentials<VectorStoreQdrantScopedApiCredentials>(
			'vectorStoreQdrantScopedApi',
		);
		const userId = ensureUserId(context);
		const client = createQdrantClient(credentials);
		const config: QdrantLibArgs = { client, collectionName: credentials.collectionName };

		await ensurePayloadIndexes(client, credentials.collectionName);

		const store = await QdrantVectorStore.fromExistingCollection(embeddings, config);
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
		const credentials = await context.getCredentials<VectorStoreQdrantScopedApiCredentials>(
			'vectorStoreQdrantScopedApi',
		);
		const userId = ensureUserId(context);
		const client = createQdrantClient(credentials);
		const config: QdrantLibArgs = { client, collectionName: credentials.collectionName };

		await ensurePayloadIndexes(client, credentials.collectionName);

		await QdrantVectorStore.fromDocuments(
			documents.map((d) => ({ ...d, metadata: { ...d.metadata, userId } })),
			embeddings,
			config,
		);
	},
}) {}

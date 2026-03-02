import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { Embeddings } from '@langchain/core/embeddings';
import type { QdrantLibArgs } from '@langchain/qdrant';
import { QdrantVectorStore } from '@langchain/qdrant';
import {
	assertParamIsString,
	jsonParse,
	NodeOperationError,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeProperties,
	type NodeParameterValueType,
} from 'n8n-workflow';

import { createQdrantClient, type QdrantCredential } from '../VectorStoreQdrant/Qdrant.utils';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { getUserScopedSlot } from '../shared/userScoped';

type VectorStoreQdrantScopedApiCredentials = QdrantCredential & {
	collectionNamePrefix: string;
};

class ExtendedQdrantVectorStore extends QdrantVectorStore {
	private static defaultFilter: IDataObject = {};

	static async fromExistingCollection(
		embeddings: Embeddings,
		args: QdrantLibArgs,
		defaultFilter: IDataObject = {},
	): Promise<QdrantVectorStore> {
		ExtendedQdrantVectorStore.defaultFilter = defaultFilter;
		return await super.fromExistingCollection(embeddings, args);
	}

	async similaritySearch(query: string, k: number, filter?: IDataObject, callbacks?: Callbacks) {
		const mergedFilter = { ...ExtendedQdrantVectorStore.defaultFilter, ...filter };
		return await super.similaritySearch(query, k, mergedFilter, callbacks);
	}
}

const sharedOptions: INodeProperties[] = [
	{
		displayName: 'Content Payload Key',
		name: 'contentPayloadKey',
		type: 'string',
		default: 'content',
		description: 'The key to use for the content payload in Qdrant. Default is "content".',
	},
	{
		displayName: 'Metadata Payload Key',
		name: 'metadataPayloadKey',
		type: 'string',
		default: 'metadata',
		description: 'The key to use for the metadata payload in Qdrant. Default is "metadata".',
	},
];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [...sharedOptions],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [...sharedOptions],
	},
];

async function deleteDocuments(
	this: ILoadOptionsFunctions,
	payload: IDataObject | string | undefined,
): Promise<NodeParameterValueType> {
	const { filter, metadataPayloadKey = 'metadata' } = (
		typeof payload === 'string' ? jsonParse(payload) : (payload ?? {})
	) as { filter: Record<string, string | string[]>; metadataPayloadKey?: string };

	if (!filter || Object.keys(filter).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'deleteDocuments requires at least one filter field.',
		);
	}

	const credentials = await this.getCredentials<VectorStoreQdrantScopedApiCredentials>(
		'vectorStoreQdrantScopedApi',
	);
	const collectionName = getUserScopedSlot(this, credentials.collectionNamePrefix);
	const client = createQdrantClient(credentials);

	const must = Object.entries(filter).map(([key, value]) => {
		if (Array.isArray(value)) {
			return { key: `${metadataPayloadKey}.${key}`, match: { any: value } };
		}
		return { key: `${metadataPayloadKey}.${key}`, match: { value } };
	});

	await client.delete(collectionName, { filter: { must } });

	return null;
}

export class VectorStoreQdrantScoped extends createVectorStoreNode<ExtendedQdrantVectorStore>({
	meta: {
		displayName: 'Qdrant Vector Store (User-Scoped)',
		name: 'vectorStoreQdrantScoped',
		description:
			'Work with your data in a Qdrant collection, scoped per user via credential collection prefix',
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
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const credentials = await context.getCredentials<VectorStoreQdrantScopedApiCredentials>(
			'vectorStoreQdrantScopedApi',
		);
		const collectionName = getUserScopedSlot(context, credentials.collectionNamePrefix, itemIndex);

		const contentPayloadKey = context.getNodeParameter('options.contentPayloadKey', itemIndex, '');
		assertParamIsString('contentPayloadKey', contentPayloadKey, context.getNode());

		const metadataPayloadKey = context.getNodeParameter(
			'options.metadataPayloadKey',
			itemIndex,
			'',
		);
		assertParamIsString('metadataPayloadKey', metadataPayloadKey, context.getNode());

		const client = createQdrantClient(credentials);

		const config: QdrantLibArgs = {
			client,
			collectionName,
			contentPayloadKey: contentPayloadKey !== '' ? contentPayloadKey : undefined,
			metadataPayloadKey: metadataPayloadKey !== '' ? metadataPayloadKey : undefined,
		};

		return await ExtendedQdrantVectorStore.fromExistingCollection(embeddings, config, filter);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const credentials = await context.getCredentials<VectorStoreQdrantScopedApiCredentials>(
			'vectorStoreQdrantScopedApi',
		);
		const collectionName = getUserScopedSlot(context, credentials.collectionNamePrefix, itemIndex);

		const contentPayloadKey = context.getNodeParameter('options.contentPayloadKey', itemIndex, '');
		assertParamIsString('contentPayloadKey', contentPayloadKey, context.getNode());

		const metadataPayloadKey = context.getNodeParameter(
			'options.metadataPayloadKey',
			itemIndex,
			'',
		);
		assertParamIsString('metadataPayloadKey', metadataPayloadKey, context.getNode());

		const client = createQdrantClient(credentials);

		const config: QdrantLibArgs = {
			client,
			collectionName,
			contentPayloadKey: contentPayloadKey !== '' ? contentPayloadKey : undefined,
			metadataPayloadKey: metadataPayloadKey !== '' ? metadataPayloadKey : undefined,
		};

		await QdrantVectorStore.fromDocuments(documents, embeddings, config);
	},
}) {}

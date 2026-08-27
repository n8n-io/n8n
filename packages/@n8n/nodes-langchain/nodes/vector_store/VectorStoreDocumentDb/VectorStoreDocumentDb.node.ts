import { Document as LangChainDocument } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';
import {
	ObjectId,
	type Document as DatabaseDocument,
	type Filter,
	type MongoClient,
} from 'mongodb';
import {
	NodeOperationError,
	UnexpectedError,
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeProperties,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import {
	connectDocumentDatabaseClient,
	validateAndResolveDocumentDatabaseCredentials,
} from 'n8n-nodes-base/dist/nodes/DocumentDb/GenericFunctions';

export const DOCUMENTDB_COLLECTION = 'documentDbCollection';
export const EMBEDDING_FIELD = 'embeddingField';
export const CONTENT_FIELD = 'contentField';
export const METADATA_FIELD = 'metadataField';
export const PRE_FILTER = 'preFilter';
export const POST_FILTER_PIPELINE = 'postFilterPipeline';

type FunctionsContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

interface DocumentDbVectorStoreConfig {
	client: MongoClient;
	collectionName: string;
	databaseName: string;
	embeddingField: string;
	contentField: string;
	metadataField: string;
	filter?: IDataObject;
	postFilterPipeline?: IDataObject[];
}

function mergeFilters(...filters: Array<IDataObject | undefined>): IDataObject | undefined {
	const definedFilters = filters.filter(
		(filter): filter is IDataObject => filter !== undefined && Object.keys(filter).length > 0,
	);
	if (definedFilters.length === 0) return undefined;
	if (definedFilters.length === 1) return definedFilters[0];
	return { $and: definedFilters };
}

export class DocumentDbVectorStore extends VectorStore {
	readonly client: MongoClient;
	private readonly collection;
	private readonly embeddingField: string;
	private readonly contentField: string;
	private readonly metadataField: string;
	private readonly filter?: IDataObject;
	private readonly postFilterPipeline: IDataObject[];

	constructor(embeddings: EmbeddingsInterface, config: DocumentDbVectorStoreConfig) {
		super(embeddings, {});
		this.client = config.client;
		this.collection = config.client.db(config.databaseName).collection(config.collectionName);
		this.embeddingField = config.embeddingField;
		this.contentField = config.contentField;
		this.metadataField = config.metadataField;
		this.filter = config.filter;
		this.postFilterPipeline = config.postFilterPipeline ?? [];
	}

	_vectorstoreType(): string {
		return 'documentdb';
	}

	async addVectors(
		vectors: number[][],
		documents: Array<LangChainDocument<Record<string, unknown>>>,
		options?: { ids?: string[] },
	): Promise<void> {
		if (vectors.length !== documents.length) {
			throw new UnexpectedError('The number of vectors must match the number of documents');
		}
		if (documents.length === 0) return;

		const databaseDocuments = documents.map((document, index) => ({
			[this.contentField]: document.pageContent,
			[this.embeddingField]: vectors[index],
			[this.metadataField]: document.metadata,
		}));

		if (options?.ids) {
			await this.collection.bulkWrite(
				databaseDocuments.map((document, index) => {
					const id = options.ids?.[index];
					if (!id) throw new UnexpectedError('A document ID is required for each vector update');
					return {
						replaceOne: {
							filter: { _id: ObjectId.isValid(id) ? new ObjectId(id) : id },
							replacement: document,
							upsert: true,
						},
					};
				}),
			);
			return;
		}

		await this.collection.insertMany(databaseDocuments);
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: this['FilterType'],
	): Promise<Array<[LangChainDocument, number]>> {
		const resolvedFilter = mergeFilters(this.filter, filter as IDataObject | undefined);
		const vectorSearch: IDataObject = {
			queryVector: query,
			path: this.embeddingField,
			numCandidates: Math.max(k * 10, k),
			limit: k,
		};
		if (resolvedFilter) vectorSearch.filter = resolvedFilter;

		const pipeline: DatabaseDocument[] = [
			{ $vectorSearch: vectorSearch },
			...this.postFilterPipeline,
			{
				$project: {
					_id: 0,
					[this.contentField]: 1,
					[this.metadataField]: 1,
					_documentDbVectorScore: { $meta: 'vectorSearchScore' },
				},
			},
		];
		const results = await this.collection.aggregate(pipeline).toArray();

		return results.map((result) => [
			new LangChainDocument({
				pageContent: String(result[this.contentField] ?? ''),
				metadata:
					typeof result[this.metadataField] === 'object' && result[this.metadataField] !== null
						? result[this.metadataField]
						: {},
			}),
			typeof result._documentDbVectorScore === 'number' ? result._documentDbVectorScore : 0,
		]);
	}
}

function getParameter(context: FunctionsContext, name: string, itemIndex: number): string {
	const value = context.getNodeParameter(name, itemIndex, '', { extractValue: true });
	if (typeof value !== 'string') {
		throw new NodeOperationError(context.getNode(), `Parameter ${name} must be a string`);
	}
	return value;
}

function getOption<T>(
	context: IExecuteFunctions | ISupplyDataFunctions,
	name: string,
	itemIndex: number,
): T | undefined {
	const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const value = options[name];
	if (value === undefined || value === '') return undefined;
	if (typeof value !== 'string') return value as T;

	try {
		return JSON.parse(value) as T;
	} catch (error) {
		throw new NodeOperationError(context.getNode(), `Could not parse JSON for ${name}`, {
			description: error instanceof Error ? error.message : String(error),
		});
	}
}

async function createClient(context: FunctionsContext): Promise<{
	client: MongoClient;
	databaseName: string;
}> {
	const credentials = await context.getCredentials('documentDbApi');
	const node = context.getNode();
	const { connectionString, database } = validateAndResolveDocumentDatabaseCredentials(
		node,
		credentials,
	);
	const client = await connectDocumentDatabaseClient(
		connectionString,
		node.typeVersion,
		credentials,
	);
	return { client, databaseName: database };
}

export async function getDocumentDbCollections(this: ILoadOptionsFunctions) {
	const { client, databaseName } = await createClient(this);
	try {
		const collections = await client.db(databaseName).listCollections().toArray();
		return {
			results: collections.map(({ name }) => ({ name, value: name })),
		};
	} finally {
		await client.close();
	}
}

const collectionField: INodeProperties = {
	displayName: 'DocumentDB Collection',
	name: DOCUMENTDB_COLLECTION,
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'documentDbCollectionSearch' },
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. documents',
		},
	],
};

const sharedFields: INodeProperties[] = [
	collectionField,
	{
		displayName: 'Embedding Field',
		name: EMBEDDING_FIELD,
		type: 'string',
		default: 'embedding',
		required: true,
		description: 'The field that contains the embedding array',
	},
	{
		displayName: 'Content Field',
		name: CONTENT_FIELD,
		type: 'string',
		default: 'text',
		required: true,
		description: 'The field that contains the document text',
	},
	{
		displayName: 'Metadata Field',
		name: METADATA_FIELD,
		type: 'string',
		default: 'metadata',
		required: true,
		description: 'The field that contains document metadata',
	},
];

const namespaceField: INodeProperties = {
	displayName: 'Namespace',
	name: 'namespace',
	type: 'string',
	default: '',
	description: 'Logical partition for documents, stored in metadata.namespace',
};

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			namespaceField,
			metadataFilterField,
			{
				displayName: 'Pre Filter',
				name: PRE_FILTER,
				type: 'json',
				default: '',
				placeholder: '{ "metadata.category": "support" }',
				description: 'Filter applied by the DocumentDB $vectorSearch stage',
			},
			{
				displayName: 'Post Filter Pipeline',
				name: POST_FILTER_PIPELINE,
				type: 'json',
				default: '',
				placeholder: '[{ "$match": { "metadata.language": "en" } }]',
				description: 'Aggregation stages applied after vector search',
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
				description: 'Whether to clear documents in the namespace before inserting data',
			},
			namespaceField,
		],
	},
];

export class VectorStoreDocumentDb extends createVectorStoreNode<DocumentDbVectorStore>({
	meta: {
		displayName: 'DocumentDB Vector Store',
		name: 'vectorStoreDocumentDb',
		description: 'Work with vector data in DocumentDB',
		icon: 'file:documentdb.png',
		docsUrl: 'https://documentdb.io/docs/',
		credentials: [{ name: 'documentDbApi', required: true }],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: { listSearch: { documentDbCollectionSearch: getDocumentDbCollections } },
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async beforeInsert(context) {
		const options = context.getNodeParameter('options', 0, {}) as IDataObject;
		if (options.clearNamespace !== true) return;

		const { client, databaseName } = await createClient(context);
		try {
			const collectionName = getParameter(context, DOCUMENTDB_COLLECTION, 0);
			const metadataField = getParameter(context, METADATA_FIELD, 0);
			const namespace = typeof options.namespace === 'string' ? options.namespace : '';
			const filter: Filter<DatabaseDocument> = namespace
				? { [`${metadataField}.namespace`]: namespace }
				: {};
			await client.db(databaseName).collection(collectionName).deleteMany(filter);
		} finally {
			await client.close();
		}
	},
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const { client, databaseName } = await createClient(context);
		try {
			const metadataField = getParameter(context, METADATA_FIELD, itemIndex);
			const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;
			const namespace = typeof options.namespace === 'string' ? options.namespace : '';
			const namespaceFilter = namespace ? { [`${metadataField}.namespace`]: namespace } : undefined;

			return new DocumentDbVectorStore(embeddings, {
				client,
				databaseName,
				collectionName: getParameter(context, DOCUMENTDB_COLLECTION, itemIndex),
				embeddingField: getParameter(context, EMBEDDING_FIELD, itemIndex),
				contentField: getParameter(context, CONTENT_FIELD, itemIndex),
				metadataField,
				filter: mergeFilters(
					filter,
					getOption<IDataObject>(context, PRE_FILTER, itemIndex),
					namespaceFilter,
				),
				postFilterPipeline: getOption<IDataObject[]>(context, POST_FILTER_PIPELINE, itemIndex),
			});
		} catch (error) {
			await client.close().catch(() => {});
			throw error;
		}
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const store = await this.getVectorStoreClient(context, undefined, embeddings, itemIndex);
		try {
			const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;
			const namespace = typeof options.namespace === 'string' ? options.namespace : '';
			const documentsWithNamespace = namespace
				? documents.map(
						(document) =>
							new LangChainDocument({
								pageContent: document.pageContent,
								metadata: { ...document.metadata, namespace },
							}),
					)
				: documents;
			await store.addDocuments(documentsWithNamespace);
		} finally {
			await store.client.close();
		}
	},
	releaseVectorStoreClient(store) {
		void store.client.close().catch(() => {});
	},
}) {}

import {
	PGVectorStore,
	type DistanceStrategy,
	type PGVectorStoreArgs,
} from '@langchain/community/vectorstores/pgvector';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import type { INodeProperties } from 'n8n-workflow';
import type pg from 'pg';

import { metadataFilterField, createVectorStoreNode } from '@n8n/ai-utilities';

type CollectionOptions = {
	useCollection?: boolean;
	collectionName?: string;
	collectionTableName?: string;
};

type ColumnOptions = {
	idColumnName: string;
	vectorColumnName: string;
	contentColumnName: string;
	metadataColumnName: string;
};

const sharedFields: INodeProperties[] = [
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: 'n8n_vectors',
		description:
			'The table name to store the vectors in. If table does not exist, it will be created.',
	},
];

const collectionField: INodeProperties = {
	displayName: 'Collection',
	name: 'collection',
	type: 'fixedCollection',
	description: 'Collection of vectors',
	default: {
		values: {
			useCollection: false,
			collectionName: 'n8n',
			collectionTable: 'n8n_vector_collections',
		},
	},
	typeOptions: {},
	placeholder: 'Add Collection Settings',
	options: [
		{
			name: 'values',
			displayName: 'Collection Settings',
			values: [
				{
					displayName: 'Use Collection',
					name: 'useCollection',
					type: 'boolean',
					default: false,
				},
				{
					displayName: 'Collection Name',
					name: 'collectionName',
					type: 'string',
					default: 'n8n',
					required: true,
					displayOptions: { show: { useCollection: [true] } },
				},
				{
					displayName: 'Collection Table Name',
					name: 'collectionTableName',
					type: 'string',
					default: 'n8n_vector_collections',
					required: true,
					displayOptions: { show: { useCollection: [true] } },
				},
			],
		},
	],
};

const columnNamesField: INodeProperties = {
	displayName: 'Column Names',
	name: 'columnNames',
	type: 'fixedCollection',
	description: 'The names of the columns in the PGVector table',
	default: {
		values: {
			idColumnName: 'id',
			vectorColumnName: 'embedding',
			contentColumnName: 'text',
			metadataColumnName: 'metadata',
		},
	},
	typeOptions: {},
	placeholder: 'Set Column Names',
	options: [
		{
			name: 'values',
			displayName: 'Column Name Settings',
			values: [
				{
					displayName: 'ID Column Name',
					name: 'idColumnName',
					type: 'string',
					default: 'id',
					required: true,
				},
				{
					displayName: 'Vector Column Name',
					name: 'vectorColumnName',
					type: 'string',
					default: 'embedding',
					required: true,
				},
				{
					displayName: 'Content Column Name',
					name: 'contentColumnName',
					type: 'string',
					default: 'text',
					required: true,
				},
				{
					displayName: 'Metadata Column Name',
					name: 'metadataColumnName',
					type: 'string',
					default: 'metadata',
					required: true,
				},
			],
		},
	],
};

const distanceStrategyField: INodeProperties = {
	displayName: 'Distance Strategy',
	name: 'distanceStrategy',
	type: 'options',
	default: 'cosine',
	description: 'The method to calculate the distance between two vectors',
	options: [
		{
			name: 'Cosine',
			value: 'cosine',
		},
		{
			name: 'Inner Product',
			value: 'innerProduct',
		},
		{
			name: 'Euclidean',
			value: 'euclidean',
		},
	],
};

const createExtensionField: INodeProperties = {
	displayName: 'Create Extension',
	name: 'createExtension',
	type: 'boolean',
	default: false,
	description:
		'Whether to create the pgvector extension if it does not exist. Requires database superuser privileges.',
};

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [collectionField, columnNamesField, createExtensionField],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			distanceStrategyField,
			collectionField,
			columnNamesField,
			metadataFilterField,
			createExtensionField,
		],
	},
];

/**
 * Extended PGVectorStore class to handle custom filtering.
 * This wrapper is necessary because when used as a retriever,
 * similaritySearchVectorWithScore should use this.filter instead of
 * expecting it from the parameter
 */
export class ExtendedPGVectorStore extends PGVectorStore {
	private readonly _createExtension: boolean;

	constructor(
		embeddings: EmbeddingsInterface,
		args: PGVectorStoreArgs & { createExtension?: boolean },
	) {
		const { createExtension, ...rest } = args;
		super(embeddings, rest);
		this._createExtension = createExtension ?? false;
	}

	static async initialize(
		embeddings: EmbeddingsInterface,
		args: PGVectorStoreArgs & { dimensions?: number; createExtension?: boolean },
	): Promise<ExtendedPGVectorStore> {
		const { dimensions, ...rest } = args;
		const postgresqlVectorStore = new this(embeddings, rest);

		await postgresqlVectorStore._initializeClient();
		await postgresqlVectorStore.ensureTableInDatabase(dimensions);
		if (postgresqlVectorStore.collectionTableName) {
			await postgresqlVectorStore.ensureCollectionTableInDatabase();
		}

		return postgresqlVectorStore;
	}

	/**
	 * Creates the destination table (and, if opted in, the pgvector extension) if they
	 * don't already exist. Extension creation is opt-in because it requires database
	 * superuser privileges, which many managed Postgres users don't have.
	 */
	override async ensureTableInDatabase(dimensions?: number): Promise<void> {
		if (this.skipInitializationCheck) return;

		if (this._createExtension) {
			const vectorQuery =
				this.extensionSchemaName == null
					? 'CREATE EXTENSION IF NOT EXISTS vector;'
					: `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA "${this.extensionSchemaName}";`;
			await this.pool.query(vectorQuery);
		}

		const extensionName =
			this.extensionSchemaName == null ? 'vector' : `"${this.extensionSchemaName}"."vector"`;
		const vectorColumnType = dimensions ? `${extensionName}(${dimensions})` : extensionName;

		const tableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.computedTableName} (
        "${this.idColumnName}" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        "${this.contentColumnName}" text,
        "${this.metadataColumnName}" jsonb,
        "${this.vectorColumnName}" ${vectorColumnType}
      );
    `;

		await this.pool.query(tableQuery);
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: PGVectorStore['FilterType'],
	) {
		const mergedFilter = { ...this.filter, ...filter };
		return await super.similaritySearchVectorWithScore(query, k, mergedFilter);
	}
}

export class VectorStorePGVector extends createVectorStoreNode<ExtendedPGVectorStore>({
	meta: {
		description: 'Work with your data in Postgresql with the PGVector extension',
		icon: 'file:postgres.svg',
		displayName: 'Postgres PGVector Store',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorepgvector/',
		name: 'vectorStorePGVector',
		credentials: [
			{
				name: 'postgres',
				required: true,
				testedBy: 'postgresConnectionTest',
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const credentials = await context.getCredentials('postgres');
		const pgConf = await configurePostgres.call(context, credentials as PostgresNodeCredentials);
		const pool = pgConf.db.$pool as unknown as pg.Pool;

		const config: PGVectorStoreArgs = {
			pool,
			tableName,
			filter,
		};

		const collectionOptions = context.getNodeParameter(
			'options.collection.values',
			0,
			{},
		) as CollectionOptions;

		if (collectionOptions?.useCollection) {
			config.collectionName = collectionOptions.collectionName;
			config.collectionTableName = collectionOptions.collectionTableName;
		}

		config.columns = context.getNodeParameter('options.columnNames.values', 0, {
			idColumnName: 'id',
			vectorColumnName: 'embedding',
			contentColumnName: 'text',
			metadataColumnName: 'metadata',
		}) as ColumnOptions;

		config.distanceStrategy = context.getNodeParameter(
			'options.distanceStrategy',
			0,
			'cosine',
		) as DistanceStrategy;

		const createExtension = context.getNodeParameter(
			'options.createExtension',
			0,
			false,
		) as boolean;

		return await ExtendedPGVectorStore.initialize(embeddings, { ...config, createExtension });
	},

	async populateVectorStore(context, embeddings, documents, itemIndex) {
		// NOTE: if you are to create the HNSW index before use, you need to consider moving the distanceStrategy field to
		// shared fields, because you need that strategy when creating the index.
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const credentials = await context.getCredentials('postgres');
		const pgConf = await configurePostgres.call(context, credentials as PostgresNodeCredentials);
		const pool = pgConf.db.$pool as unknown as pg.Pool;

		const config: PGVectorStoreArgs = {
			pool,
			tableName,
		};

		const collectionOptions = context.getNodeParameter(
			'options.collection.values',
			0,
			{},
		) as CollectionOptions;

		if (collectionOptions?.useCollection) {
			config.collectionName = collectionOptions.collectionName;
			config.collectionTableName = collectionOptions.collectionTableName;
		}

		config.columns = context.getNodeParameter('options.columnNames.values', 0, {
			idColumnName: 'id',
			vectorColumnName: 'embedding',
			contentColumnName: 'text',
			metadataColumnName: 'metadata',
		}) as ColumnOptions;

		const createExtension = context.getNodeParameter(
			'options.createExtension',
			0,
			false,
		) as boolean;

		const vectorStore = await ExtendedPGVectorStore.initialize(embeddings, {
			...config,
			createExtension,
		});
		await vectorStore.addDocuments(documents);
		vectorStore.client?.release();
	},

	releaseVectorStoreClient(vectorStore) {
		vectorStore.client?.release();
	},
}) {}

import {
	PGVectorStore,
	type DistanceStrategy,
	type PGVectorStoreArgs,
} from '@langchain/community/vectorstores/pgvector';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { metadataFilterField, createVectorStoreNode } from '@n8n/ai-utilities';
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { PostgresNodeCredentials } from 'n8n-nodes-base/dist/nodes/Postgres/v2/helpers/interfaces';
import type { IExecuteFunctions, INode, INodeProperties, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type pg from 'pg';

import {
	escapeQualifiedSqlIdentifier,
	escapeSqlIdentifier,
	findUnsafeMetadataFilterKey,
	isSafeQualifiedSqlIdentifier,
	isSafeSqlIdentifier,
} from '@utils/sqlIdentifier';

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

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [collectionField, columnNamesField],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [distanceStrategyField, collectionField, columnNamesField, metadataFilterField],
	},
];

/**
 * Validates a table/collection-table name. It is interpolated into SQL (and into
 * constraint/index names) by the underlying store, so reject anything that is not
 * a plain, optionally schema-qualified identifier. The value is also quoted before
 * use, so this rejection is a defence-in-depth layer with a clear error.
 */
function validateTableName(
	context: IExecuteFunctions | ISupplyDataFunctions,
	value: string,
	label: string,
): void {
	if (!isSafeQualifiedSqlIdentifier(value)) {
		throw new NodeOperationError(context.getNode(), `Invalid ${label} "${value}"`, {
			description:
				'It may only contain letters, numbers and underscores, with an optional "schema." prefix.',
		});
	}
}

/**
 * Validates the configured column names. They are interpolated into SQL by the
 * underlying store in both quoted and unquoted positions, so restrict them to
 * plain identifiers to keep them inert.
 */
function validateColumnNames(
	context: IExecuteFunctions | ISupplyDataFunctions,
	columns: ColumnOptions,
): void {
	for (const [field, value] of Object.entries(columns)) {
		if (typeof value === 'string' && !isSafeSqlIdentifier(value)) {
			throw new NodeOperationError(
				context.getNode(),
				`Invalid column name "${value}" configured for "${field}"`,
				{
					description:
						'Column names may only contain letters, numbers and underscores, and must not start with a number.',
				},
			);
		}
	}
}

/**
 * Extended PGVectorStore class to handle custom filtering.
 * This wrapper is necessary because when used as a retriever,
 * similaritySearchVectorWithScore should use this.filter instead of
 * expecting it from the parameter
 *
 * The identifier getters and collection-table setup are overridden so the
 * table and collection table names are quoted before being interpolated into
 * SQL by the base class.
 */
export class ExtendedPGVectorStore extends PGVectorStore {
	/** Node reference used to attribute validation errors; set by `initialize`. */
	n8nNode!: INode;

	get computedTableName(): string {
		return this.schemaName === null
			? escapeQualifiedSqlIdentifier(this.tableName)
			: `${escapeSqlIdentifier(this.schemaName)}.${escapeSqlIdentifier(this.tableName)}`;
	}

	get computedCollectionTableName(): string {
		if (!this.collectionTableName) return '';
		return this.schemaName === null
			? escapeQualifiedSqlIdentifier(this.collectionTableName)
			: `${escapeSqlIdentifier(this.schemaName)}.${escapeSqlIdentifier(this.collectionTableName)}`;
	}

	async ensureCollectionTableInDatabase(): Promise<void> {
		try {
			if (this.skipInitializationCheck) return;

			// The constraint and index names embed the table/collection name as
			// plain identifier fragments, so escape the composed names too.
			const indexName = escapeSqlIdentifier(`idx_${this.collectionTableName}_name`);
			const constraintName = escapeSqlIdentifier(`${this.tableName}_collection_id_fkey`);

			const queryString = `
        CREATE TABLE IF NOT EXISTS ${this.computedCollectionTableName} (
          uuid uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          name character varying,
          cmetadata jsonb
        );

        CREATE INDEX IF NOT EXISTS ${indexName} ON ${this.computedCollectionTableName}(name);

        ALTER TABLE ${this.computedTableName}
          ADD COLUMN collection_id uuid;

        ALTER TABLE ${this.computedTableName}
          ADD CONSTRAINT ${constraintName}
          FOREIGN KEY (collection_id)
          REFERENCES ${this.computedCollectionTableName}(uuid)
          ON DELETE CASCADE;
      `;
			await this.pool.query(queryString);
		} catch (e) {
			// Mirror the base class: ignore "already exists" races, surface anything else.
			if (e instanceof Error && e.message.includes('already exists')) {
				return;
			}
			throw e;
		}
	}

	static async initialize(
		embeddings: EmbeddingsInterface,
		args: PGVectorStoreArgs & { dimensions?: number; n8nNode: INode },
	): Promise<ExtendedPGVectorStore> {
		const { dimensions, n8nNode, ...rest } = args;
		const postgresqlVectorStore = new this(embeddings, rest);
		postgresqlVectorStore.n8nNode = n8nNode;

		await postgresqlVectorStore._initializeClient();
		await postgresqlVectorStore.ensureTableInDatabase(dimensions);
		if (postgresqlVectorStore.collectionTableName) {
			await postgresqlVectorStore.ensureCollectionTableInDatabase();
		}

		return postgresqlVectorStore;
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: PGVectorStore['FilterType'],
	) {
		const mergedFilter = { ...this.filter, ...filter };
		// Validate here (not only at construction) because load and
		// retrieve-as-tool modes pass the filter at search time.
		const unsafeKey = findUnsafeMetadataFilterKey(mergedFilter);
		if (unsafeKey !== undefined) {
			throw new NodeOperationError(this.n8nNode, `Invalid metadata filter key "${unsafeKey}"`, {
				description:
					"Metadata filter keys must not contain quote (') or backslash (\\) characters.",
			});
		}
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
		// An expression-bound Table Name can resolve to an empty value, so fall back to the default.
		const tableName =
			(context.getNodeParameter('tableName', itemIndex, '', { extractValue: true }) as string) ||
			'n8n_vectors';
		validateTableName(context, tableName, 'table name');
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
			if (collectionOptions.collectionTableName) {
				validateTableName(context, collectionOptions.collectionTableName, 'collection table name');
			}
			config.collectionName = collectionOptions.collectionName;
			config.collectionTableName = collectionOptions.collectionTableName;
		}

		const columns = context.getNodeParameter('options.columnNames.values', 0, {
			idColumnName: 'id',
			vectorColumnName: 'embedding',
			contentColumnName: 'text',
			metadataColumnName: 'metadata',
		}) as ColumnOptions;
		validateColumnNames(context, columns);
		config.columns = columns;

		config.distanceStrategy = context.getNodeParameter(
			'options.distanceStrategy',
			0,
			'cosine',
		) as DistanceStrategy;

		return await ExtendedPGVectorStore.initialize(embeddings, {
			...config,
			n8nNode: context.getNode(),
		});
	},

	async populateVectorStore(context, embeddings, documents, itemIndex) {
		// NOTE: if you are to create the HNSW index before use, you need to consider moving the distanceStrategy field to
		// shared fields, because you need that strategy when creating the index.
		// An expression-bound Table Name can resolve to an empty value, so fall back to the default.
		const tableName =
			(context.getNodeParameter('tableName', itemIndex, '', { extractValue: true }) as string) ||
			'n8n_vectors';
		validateTableName(context, tableName, 'table name');
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
			if (collectionOptions.collectionTableName) {
				validateTableName(context, collectionOptions.collectionTableName, 'collection table name');
			}
			config.collectionName = collectionOptions.collectionName;
			config.collectionTableName = collectionOptions.collectionTableName;
		}

		const columns = context.getNodeParameter('options.columnNames.values', 0, {
			idColumnName: 'id',
			vectorColumnName: 'embedding',
			contentColumnName: 'text',
			metadataColumnName: 'metadata',
		}) as ColumnOptions;
		validateColumnNames(context, columns);
		config.columns = columns;

		// Use ExtendedPGVectorStore (not PGVectorStore.fromDocuments, whose static
		// helpers construct a plain PGVectorStore) so the identifier-quoting
		// overrides apply on the insert path too.
		const vectorStore = await ExtendedPGVectorStore.initialize(embeddings, {
			...config,
			n8nNode: context.getNode(),
		});
		await vectorStore.addDocuments(documents);
		vectorStore.client?.release();
	},

	releaseVectorStoreClient(vectorStore) {
		vectorStore.client?.release();
	},
}) {}

import { VectorStore } from '@langchain/core/vectorstores';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import type { INodeProperties } from 'n8n-workflow';
import pg from 'pg';
import crypto from 'node:crypto';

import { metadataFilterField } from '@utils/sharedFields';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';

// ─── Types ───────────────────────────────────────────────────────────────────

type DistanceMethod = 'Cosine' | 'InnerProduct' | 'Euclidean';

type ColumnOptions = {
	idColumnName: string;
	vectorColumnName: string;
	contentColumnName: string;
	metadataColumnName: string;
};

type HGraphIndexSettings = {
	baseQuantizationType: string;
	useReorder: boolean;
	preciseQuantizationType?: string;
	preciseIoType?: string;
	maxDegree: number;
	efConstruction: number;
};

interface HologresVectorStoreArgs {
	pool: pg.Pool;
	tableName: string;
	dimensions: number;
	distanceMethod: DistanceMethod;
	columns: ColumnOptions;
	indexSettings: HGraphIndexSettings;
	filter?: Record<string, unknown>;
}

// ─── HologresVectorStore Class ───────────────────────────────────────────────

class HologresVectorStore extends VectorStore {
	declare FilterType: Record<string, unknown>;

	pool: pg.Pool;

	client?: pg.PoolClient;

	tableName: string;

	dimensions: number;

	distanceMethod: DistanceMethod;

	columns: ColumnOptions;

	indexSettings: HGraphIndexSettings;

	filter?: Record<string, unknown>;

	_vectorstoreType(): string {
		return 'hologres';
	}

	constructor(embeddings: EmbeddingsInterface, args: HologresVectorStoreArgs) {
		super(embeddings, args);
		this.pool = args.pool;
		this.tableName = args.tableName;
		this.dimensions = args.dimensions;
		this.distanceMethod = args.distanceMethod;
		this.columns = args.columns;
		this.indexSettings = args.indexSettings;
		this.filter = args.filter;
	}

	async _initializeClient(): Promise<void> {
		this.client = await this.pool.connect();
	}

	/**
	 * Creates the table if it does not exist with the Hologres-specific
	 * float4[] + CHECK constraint for vector columns.
	 */
	async ensureTableInDatabase(): Promise<void> {
		const { idColumnName, contentColumnName, metadataColumnName, vectorColumnName } = this.columns;
		const tableQuery = `
			CREATE TABLE IF NOT EXISTS ${this.tableName} (
				"${idColumnName}" text NOT NULL PRIMARY KEY,
				"${contentColumnName}" text,
				"${metadataColumnName}" jsonb,
				"${vectorColumnName}" float4[] CHECK (
					array_ndims("${vectorColumnName}") = 1
					AND array_length("${vectorColumnName}", 1) = ${this.dimensions}
				)
			);
		`;
		await this.pool.query(tableQuery);
	}

	/**
	 * Sets the HGraph vector index on the table via ALTER TABLE SET.
	 */
	async ensureVectorIndex(): Promise<void> {
		const { vectorColumnName } = this.columns;
		const builderParams: Record<string, unknown> = {
			base_quantization_type: this.indexSettings.baseQuantizationType,
			max_degree: this.indexSettings.maxDegree,
			ef_construction: this.indexSettings.efConstruction,
		};

		if (this.indexSettings.useReorder) {
			builderParams.use_reorder = true;
			if (this.indexSettings.preciseQuantizationType) {
				builderParams.precise_quantization_type = this.indexSettings.preciseQuantizationType;
			}
			if (this.indexSettings.preciseIoType) {
				builderParams.precise_io_type = this.indexSettings.preciseIoType;
			}
		}

		const vectorsConfig = JSON.stringify({
			[vectorColumnName]: {
				algorithm: 'HGraph',
				distance_method: this.distanceMethod,
				builder_params: builderParams,
			},
		});

		const alterQuery = `ALTER TABLE ${this.tableName} SET (vectors = '${vectorsConfig}');`;
		await this.pool.query(alterQuery);
	}

	static async initialize(
		embeddings: EmbeddingsInterface,
		args: HologresVectorStoreArgs,
	): Promise<HologresVectorStore> {
		const store = new HologresVectorStore(embeddings, args);
		await store._initializeClient();
		await store.ensureTableInDatabase();
		await store.ensureVectorIndex();
		return store;
	}

	async addDocuments(documents: Document[], options?: { ids?: string[] }): Promise<string[]> {
		const texts = documents.map(({ pageContent }) => pageContent);
		const vectors = await this.embeddings.embedDocuments(texts);
		return await this.addVectors(vectors, documents, options);
	}

	async addVectors(
		vectors: number[][],
		documents: Document[],
		options?: { ids?: string[] },
	): Promise<string[]> {
		const ids = options?.ids ?? vectors.map(() => crypto.randomUUID());
		const { idColumnName, contentColumnName, vectorColumnName, metadataColumnName } = this.columns;

		for (let i = 0; i < vectors.length; i++) {
			const embeddingString = `{${vectors[i].join(',')}}`;
			const queryText = `
				INSERT INTO ${this.tableName}(
					"${idColumnName}", "${contentColumnName}", "${vectorColumnName}", "${metadataColumnName}"
				)
				VALUES ($1, $2, $3::float4[], $4::jsonb)
			`;
			await this.pool.query(queryText, [
				ids[i],
				documents[i].pageContent,
				embeddingString,
				JSON.stringify(documents[i].metadata),
			]);
		}
		return ids;
	}

	/**
	 * Returns the Hologres approx distance function name and ORDER BY direction
	 * for the configured distance method.
	 */
	private getDistanceFunctionAndOrder(): { func: string; order: string } {
		switch (this.distanceMethod) {
			case 'Cosine':
				return { func: 'approx_cosine_distance', order: 'DESC' };
			case 'InnerProduct':
				return { func: 'approx_inner_product_distance', order: 'DESC' };
			case 'Euclidean':
				return { func: 'approx_euclidean_distance', order: 'ASC' };
			default:
				return { func: 'approx_cosine_distance', order: 'DESC' };
		}
	}

	/**
	 * Build WHERE clause from a metadata filter object.
	 */
	private buildFilterClauses(
		filter: Record<string, unknown>,
		paramOffset = 0,
	): { whereClauses: string[]; parameters: unknown[]; paramCount: number } {
		const whereClauses: string[] = [];
		const parameters: unknown[] = [];
		let paramCount = paramOffset;

		for (const [key, value] of Object.entries(filter)) {
			paramCount += 1;
			whereClauses.push(`${this.columns.metadataColumnName}->>'${key}' = $${paramCount}`);
			parameters.push(value);
		}

		return { whereClauses, parameters, paramCount };
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<[Document, number][]> {
		const { func, order } = this.getDistanceFunctionAndOrder();
		const { vectorColumnName } = this.columns;
		const embeddingString = `{${query.join(',')}}`;

		const mergedFilter = { ...this.filter, ...filter };
		const baseParams: unknown[] = [embeddingString, k];
		let paramOffset = 2;

		let whereClause = '';
		if (Object.keys(mergedFilter).length > 0) {
			const { whereClauses, parameters } = this.buildFilterClauses(mergedFilter, paramOffset);
			baseParams.push(...parameters);
			whereClause = `WHERE ${whereClauses.join(' AND ')}`;
		}

		const queryString = `
			SELECT *, ${func}("${vectorColumnName}", $1::float4[]) AS "_distance"
			FROM ${this.tableName}
			${whereClause}
			ORDER BY "_distance" ${order}
			LIMIT $2
		`;

		const result = await this.pool.query(queryString, baseParams);
		const results: [Document, number][] = [];

		for (const row of result.rows) {
			if (row._distance != null && row[this.columns.contentColumnName] != null) {
				const doc = new Document({
					pageContent: row[this.columns.contentColumnName] as string,
					metadata: (row[this.columns.metadataColumnName] as Record<string, unknown>) ?? {},
					id: row[this.columns.idColumnName] as string,
				});
				results.push([doc, row._distance as number]);
			}
		}

		return results;
	}

	async delete(params: { ids: string[] }): Promise<void> {
		const { idColumnName } = this.columns;
		const queryString = `
			DELETE FROM ${this.tableName}
			WHERE "${idColumnName}" = ANY($1::text[])
		`;
		await this.pool.query(queryString, [params.ids]);
	}

	static async fromDocuments(
		docs: Document[],
		embeddings: EmbeddingsInterface,
		args: HologresVectorStoreArgs,
	): Promise<HologresVectorStore> {
		const instance = await HologresVectorStore.initialize(embeddings, args);
		await instance.addDocuments(docs);
		return instance;
	}
}

// ─── Node Field Definitions ──────────────────────────────────────────────────

const sharedFields: INodeProperties[] = [
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: 'n8n_hologres_vectors',
		description:
			'The table name to store the vectors in. If the table does not exist, it will be created.',
	},
];

const dimensionsField: INodeProperties = {
	displayName: 'Dimensions',
	name: 'dimensions',
	type: 'number',
	default: 1536,
	required: true,
	description:
		'The number of dimensions of the embedding vectors. Must match the output of your embedding model.',
};

const distanceMethodField: INodeProperties = {
	displayName: 'Distance Method',
	name: 'distanceMethod',
	type: 'options',
	default: 'Cosine',
	description: 'The distance calculation method for vector search',
	options: [
		{ name: 'Cosine', value: 'Cosine' },
		{ name: 'Inner Product', value: 'InnerProduct' },
		{ name: 'Euclidean', value: 'Euclidean' },
	],
};

const columnNamesField: INodeProperties = {
	displayName: 'Column Names',
	name: 'columnNames',
	type: 'fixedCollection',
	description: 'The names of the columns in the Hologres table',
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

const hgraphIndexField: INodeProperties = {
	displayName: 'HGraph Index Settings',
	name: 'hgraphIndex',
	type: 'fixedCollection',
	description: 'Configuration for the Hologres HGraph vector index',
	default: {
		values: {
			baseQuantizationType: 'rabitq',
			useReorder: true,
			preciseQuantizationType: 'fp32',
			preciseIoType: 'block_memory_io',
			maxDegree: 64,
			efConstruction: 400,
		},
	},
	placeholder: 'Configure HGraph Index',
	options: [
		{
			name: 'values',
			displayName: 'HGraph Index Parameters',
			values: [
				{
					displayName: 'Base Quantization Type',
					name: 'baseQuantizationType',
					type: 'options',
					default: 'rabitq',
					required: true,
					description: 'Low-precision index quantization method',
					options: [
						{ name: 'RaBitQ', value: 'rabitq' },
						{ name: 'SQ8', value: 'sq8' },
						{ name: 'SQ8 Uniform', value: 'sq8_uniform' },
						{ name: 'FP16', value: 'fp16' },
						{ name: 'FP32', value: 'fp32' },
					],
				},
				{
					displayName: 'Use Reorder',
					name: 'useReorder',
					type: 'boolean',
					default: true,
					description:
						'Whether to use high-precision index for reordering. When enabled, allows configuring precise quantization type and IO type.',
				},
				{
					displayName: 'Precise Quantization Type',
					name: 'preciseQuantizationType',
					type: 'options',
					default: 'fp32',
					description:
						'High-precision index quantization method. Should be higher precision than the base quantization type.',
					displayOptions: { show: { useReorder: [true] } },
					options: [
						{ name: 'FP32', value: 'fp32' },
						{ name: 'FP16', value: 'fp16' },
						{ name: 'SQ8', value: 'sq8' },
						{ name: 'SQ8 Uniform', value: 'sq8_uniform' },
					],
				},
				{
					displayName: 'Precise IO Type',
					name: 'preciseIoType',
					type: 'options',
					default: 'block_memory_io',
					description: 'Storage medium for the high-precision index',
					displayOptions: { show: { useReorder: [true] } },
					options: [
						{
							name: 'Block Memory IO',
							value: 'block_memory_io',
							description: 'Both low and high precision indexes stored in memory',
						},
						{
							name: 'Reader IO',
							value: 'reader_io',
							description: 'Low precision in memory, high precision on disk',
						},
					],
				},
				{
					displayName: 'Max Degree',
					name: 'maxDegree',
					type: 'number',
					default: 64,
					description:
						'Max connections per vertex during index construction. Higher values improve search quality but increase build cost. Not recommended to exceed 96.',
				},
				{
					displayName: 'EF Construction',
					name: 'efConstruction',
					type: 'number',
					default: 400,
					description:
						'Search depth during index construction. Higher values improve accuracy but increase build time. Not recommended to exceed 600.',
				},
			],
		},
	],
};

const insertFields: INodeProperties[] = [
	dimensionsField,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [distanceMethodField, columnNamesField, hgraphIndexField],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [distanceMethodField, columnNamesField, metadataFilterField],
	},
];

// ─── Helper Functions ────────────────────────────────────────────────────────

function createPoolFromCredentials(credentials: Record<string, unknown>): pg.Pool {
	return new pg.Pool({
		host: credentials.host as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
		max: (credentials.maxConnections as number) ?? 100,
		ssl: false,
		application_name: 'n8n_hologres_vector_store',
	});
}

function getColumnOptions(context: {
	getNodeParameter: (name: string, index: number, fallback: unknown) => unknown;
}): ColumnOptions {
	return context.getNodeParameter('options.columnNames.values', 0, {
		idColumnName: 'id',
		vectorColumnName: 'embedding',
		contentColumnName: 'text',
		metadataColumnName: 'metadata',
	}) as ColumnOptions;
}

function getHGraphIndexSettings(context: {
	getNodeParameter: (name: string, index: number, fallback: unknown) => unknown;
}): HGraphIndexSettings {
	const settings = context.getNodeParameter('options.hgraphIndex.values', 0, {
		baseQuantizationType: 'rabitq',
		useReorder: true,
		preciseQuantizationType: 'fp32',
		preciseIoType: 'block_memory_io',
		maxDegree: 64,
		efConstruction: 400,
	}) as HGraphIndexSettings;
	return settings;
}

// ─── Node Class ──────────────────────────────────────────────────────────────

export class VectorStoreHologres extends createVectorStoreNode<HologresVectorStore>({
	meta: {
		description: 'Work with your data in Hologres with HGraph vector index',
		icon: 'file:hologres.svg',
		displayName: 'Hologres Vector Store',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorehologres/',
		name: 'vectorStoreHologres',
		credentials: [
			{
				name: 'hologresApi',
				required: true,
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
		const credentials = await context.getCredentials('hologresApi');
		const pool = createPoolFromCredentials(credentials);

		const columns = getColumnOptions(context);
		const distanceMethod = context.getNodeParameter(
			'options.distanceMethod',
			0,
			'Cosine',
		) as DistanceMethod;

		// For retrieve operations, dimensions is not strictly required since
		// the table already exists. Use 0 as a placeholder — ensureTableInDatabase
		// uses CREATE TABLE IF NOT EXISTS so it won't recreate the table.
		const dimensions = 0;

		const config: HologresVectorStoreArgs = {
			pool,
			tableName,
			dimensions,
			distanceMethod,
			columns,
			indexSettings: {
				baseQuantizationType: 'rabitq',
				useReorder: true,
				preciseQuantizationType: 'fp32',
				preciseIoType: 'block_memory_io',
				maxDegree: 64,
				efConstruction: 400,
			},
			filter,
		};

		const store = new HologresVectorStore(embeddings, config);
		await store._initializeClient();
		// Skip table/index creation for retrieve — table must already exist
		return store;
	},

	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const dimensions = context.getNodeParameter('dimensions', itemIndex, 1536) as number;
		const credentials = await context.getCredentials('hologresApi');
		const pool = createPoolFromCredentials(credentials);

		const columns = getColumnOptions(context);
		const distanceMethod = context.getNodeParameter(
			'options.distanceMethod',
			0,
			'Cosine',
		) as DistanceMethod;
		const indexSettings = getHGraphIndexSettings(context);

		const config: HologresVectorStoreArgs = {
			pool,
			tableName,
			dimensions,
			distanceMethod,
			columns,
			indexSettings,
		};

		const vectorStore = await HologresVectorStore.fromDocuments(documents, embeddings, config);
		vectorStore.client?.release();
	},

	releaseVectorStoreClient(vectorStore) {
		vectorStore.client?.release();
	},
}) {}

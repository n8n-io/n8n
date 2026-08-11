import type { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { createVectorStoreNode, metadataFilterField } from '@n8n/ai-utilities';
import { DistanceStrategy, OracleVS, type OracleDBVSArgs } from '@oracle/langchain-oracledb';
import type { OracleDBNodeCredentials } from 'n8n-nodes-base/dist/nodes/Oracle/Sql/helpers/interfaces';
import { configureOracleDB } from 'n8n-nodes-base/dist/nodes/Oracle/Sql/transport';
import type { IExecuteFunctions, INodeProperties, ISupplyDataFunctions } from 'n8n-workflow';
import type oracledb from 'oracledb';

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

const DEFAULT_INITIALIZATION_TEXT = 'n8n vector store initialization text';

const NO_ROWS_FOUND_ERROR_MESSAGE = 'No rows found.';

const isNoRowsFoundError = (error: unknown): error is Error =>
	error instanceof Error && error.message === NO_ROWS_FOUND_ERROR_MESSAGE;

type OracleFilter = OracleVS['FilterType'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Deeply merges stored node filter and ad-hoc runtime filter so both sets of predicates apply.
 * Example:
 *   base      → { $and: [{ project: 'n8n' }], nested: { flag: true } }
 *   override  → { $and: [{ language: 'en' }], nested: { rating: { $gte: 4.5 } } }
 *   result    → { $and: [{ project: 'n8n' }, { language: 'en' }],
 *                 nested: { flag: true, rating: { $gte: 4.5 } } }
 *
 * Arrays (e.g. $and/$or/$in) are concatenated; plain objects merge recursively; scalars favour override.
 */
const mergeFilters = (base?: OracleFilter, override?: OracleFilter): OracleFilter | undefined => {
	if (base === undefined || base === null) return override;
	if (override === undefined || override === null) return base;

	if (Array.isArray(base) && Array.isArray(override)) {
		return [...base, ...override] as unknown as OracleFilter;
	}

	if (isPlainObject(base) && isPlainObject(override)) {
		const result: Record<string, unknown> = { ...base };

		for (const [key, overrideValue] of Object.entries(override)) {
			result[key] = mergeFilters(base[key] as OracleFilter, overrideValue as OracleFilter);
		}

		return result as OracleFilter;
	}

	return override;
};

// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
const distanceStrategyField: INodeProperties = {
	displayName: 'Distance Strategy',
	name: 'distanceStrategy',
	type: 'options',
	default: DistanceStrategy.COSINE,
	description: 'The method to calculate the distance between two vectors',
	options: [
		{
			name: 'Cosine',
			value: DistanceStrategy.COSINE,
		},
		{
			name: 'Inner Product',
			value: DistanceStrategy.DOT_PRODUCT,
		},
		{
			name: 'Euclidean',
			value: DistanceStrategy.EUCLIDEAN,
		},
		{
			name: 'Manhattan',
			value: DistanceStrategy.MANHATTAN,
		},
		{
			name: 'Euclidean Squared',
			value: DistanceStrategy.EUCLIDEAN_SQUARED,
		},
		{
			name: 'Hamming',
			value: DistanceStrategy.HAMMING,
		},
	],
};

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [distanceStrategyField, metadataFilterField],
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

class LazyOraclePool {
	constructor(private readonly getPool: () => Promise<oracledb.Pool>) {}

	async getConnection(): Promise<oracledb.Connection> {
		const pool = await this.getPool();
		return await pool.getConnection();
	}

	async close(): Promise<void> {
		// ConnectionPoolManager owns lifecycle; keep the shared pool alive.
	}
}

const createLazyOraclePool = (
	context: IExecuteFunctions | ISupplyDataFunctions,
	credentials: OracleDBNodeCredentials,
) => {
	const getPool = async () => await configureOracleDB.call(context, credentials);
	// OracleVS expects an oracledb.Pool, but it only uses getConnection/close.
	// We provide a lightweight wrapper that matches that subset of the interface.
	return new LazyOraclePool(getPool) as unknown as oracledb.Pool;
};

/**
 * Extends OracleVS so retriever calls merge the node-level filter
 * with any ad-hoc filter provided at runtime.
 */
class ExtendedOracleDBVectorStore extends OracleVS {
	static async initialize(
		embeddings: EmbeddingsInterface,
		args: OracleDBVSArgs,
	): Promise<ExtendedOracleDBVectorStore> {
		const oracleDBVectorStore = new this(embeddings, args);

		await oracleDBVectorStore.initialize();
		return oracleDBVectorStore;
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: OracleVS['FilterType'],
	) {
		const mergedFilter = mergeFilters(this.filter, filter);

		try {
			return await super.similaritySearchVectorWithScore(query, k, mergedFilter);
		} catch (error) {
			if (isNoRowsFoundError(error)) return [];
			throw error;
		}
	}
}

export class VectorStoreOracleDB extends createVectorStoreNode<ExtendedOracleDBVectorStore>({
	meta: {
		description: 'Work with your data in OracleDB vector support',
		icon: 'file:../../shared/icons/oracle.svg',
		displayName: 'Oracle Database Vector Store',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreoracledb/',
		name: 'vectorStoreOracleDBVector',
		credentials: [
			{
				name: 'oracleDBApi',
				required: true,
				testedBy: 'oracleDBConnectionTest',
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(
		context: IExecuteFunctions | ISupplyDataFunctions,
		filter: Record<string, never> | undefined,
		embeddings: EmbeddingsInterface,
		itemIndex: number,
	): Promise<ExtendedOracleDBVectorStore> {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const credentials = (await context.getCredentials('oracleDBApi')) as OracleDBNodeCredentials;
		const client = createLazyOraclePool(context, credentials);
		const query = DEFAULT_INITIALIZATION_TEXT;
		const config: OracleDBVSArgs = {
			client,
			tableName,
			query,
			filter: filter as ExtendedOracleDBVectorStore['FilterType'] | undefined,
		};

		config.distanceStrategy = context.getNodeParameter(
			'options.distanceStrategy',
			itemIndex,
			DistanceStrategy.COSINE,
		) as DistanceStrategy;

		return await ExtendedOracleDBVectorStore.initialize(embeddings, config);
	},

	async populateVectorStore(
		context: IExecuteFunctions | ISupplyDataFunctions,
		embeddings: EmbeddingsInterface,
		documents: Array<Document<Record<string, unknown>>>,
		itemIndex: number,
	): Promise<void> {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const credentials = (await context.getCredentials('oracleDBApi')) as OracleDBNodeCredentials;
		const client = createLazyOraclePool(context, credentials);
		const query = DEFAULT_INITIALIZATION_TEXT;
		const config: OracleDBVSArgs = {
			client,
			tableName,
			query,
		};

		await OracleVS.fromDocuments(documents, embeddings, config);
	},

	releaseVectorStoreClient(vectorStore) {
		const pool = vectorStore.client;
		if (pool && typeof pool.close === 'function') {
			void pool.close().catch(() => {});
		}
	},
}) {}

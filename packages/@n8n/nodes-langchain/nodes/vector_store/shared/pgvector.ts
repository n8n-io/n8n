import {
	PGVectorStore,
	type DistanceStrategy,
	type PGVectorStoreArgs,
} from '@langchain/community/vectorstores/pgvector';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { IExecuteFunctions, INodeProperties, ISupplyDataFunctions } from 'n8n-workflow';
import type pg from 'pg';

import type { VectorStoreNodeConstructorArgs } from './createVectorStoreNode/types';

export type ColumnOptions = {
	idColumnName: string;
	vectorColumnName: string;
	contentColumnName: string;
	metadataColumnName: string;
};

export type CollectionOptions = {
	useCollection?: boolean;
	collectionName?: string;
	collectionTableName?: string;
};

const defaultColumnOptions: ColumnOptions = {
	idColumnName: 'id',
	vectorColumnName: 'embedding',
	contentColumnName: 'text',
	metadataColumnName: 'metadata',
};

export const columnNamesField: INodeProperties = {
	displayName: 'Column Names',
	name: 'columnNames',
	type: 'fixedCollection',
	description: 'The names of the columns in the PGVector table',
	default: { values: defaultColumnOptions },
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

export const collectionField: INodeProperties = {
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

export const distanceStrategyField: INodeProperties = {
	displayName: 'Distance Strategy',
	name: 'distanceStrategy',
	type: 'options',
	default: 'cosine',
	description: 'The method to calculate the distance between two vectors',
	options: [
		{ name: 'Cosine', value: 'cosine' },
		{ name: 'Inner Product', value: 'innerProduct' },
		{ name: 'Euclidean', value: 'euclidean' },
	],
};

/**
 * Extended PGVectorStore to handle custom filtering when used as a retriever.
 */
export class ExtendedPGVectorStore extends PGVectorStore {
	static async initialize(
		embeddings: EmbeddingsInterface,
		args: PGVectorStoreArgs & { dimensions?: number },
	): Promise<ExtendedPGVectorStore> {
		const { dimensions, ...rest } = args;
		const store = new this(embeddings, rest);
		await store._initializeClient();
		await store.ensureTableInDatabase(dimensions);
		if (store.collectionTableName) {
			await store.ensureCollectionTableInDatabase();
		}
		return store;
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

export type GetPgPoolAndTableName = (
	context: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
) => Promise<{ pool: pg.Pool; tableName: string }>;

type PGVectorNodeArgsInput = Omit<
	VectorStoreNodeConstructorArgs<ExtendedPGVectorStore>,
	'getVectorStoreClient' | 'populateVectorStore' | 'releaseVectorStoreClient'
> & {
	getPoolAndTableName: GetPgPoolAndTableName;
};

export function createPGVectorNodeArgs(
	args: PGVectorNodeArgsInput,
): VectorStoreNodeConstructorArgs<ExtendedPGVectorStore> {
	return {
		...args,

		async getVectorStoreClient(context, filter, embeddings, itemIndex) {
			const { pool, tableName } = await args.getPoolAndTableName(context, itemIndex);

			const config: PGVectorStoreArgs = { pool, tableName, filter };

			const collectionOptions = context.getNodeParameter(
				'options.collection.values',
				0,
				{},
			) as CollectionOptions;
			if (collectionOptions?.useCollection) {
				config.collectionName = collectionOptions.collectionName;
				config.collectionTableName = collectionOptions.collectionTableName;
			}

			config.columns = context.getNodeParameter(
				'options.columnNames.values',
				itemIndex,
				defaultColumnOptions,
			) as ColumnOptions;

			config.distanceStrategy = context.getNodeParameter(
				'options.distanceStrategy',
				itemIndex,
				'cosine',
			) as DistanceStrategy;

			return await ExtendedPGVectorStore.initialize(embeddings, config);
		},

		async populateVectorStore(context, embeddings, documents, itemIndex) {
			const { pool, tableName } = await args.getPoolAndTableName(context, itemIndex);

			const config: PGVectorStoreArgs = { pool, tableName };

			const collectionOptions = context.getNodeParameter(
				'options.collection.values',
				0,
				{},
			) as CollectionOptions;
			if (collectionOptions?.useCollection) {
				config.collectionName = collectionOptions.collectionName;
				config.collectionTableName = collectionOptions.collectionTableName;
			}

			config.columns = context.getNodeParameter(
				'options.columnNames.values',
				itemIndex,
				defaultColumnOptions,
			) as ColumnOptions;

			const vectorStore = await PGVectorStore.fromDocuments(documents, embeddings, config);
			vectorStore.client?.release();
		},

		releaseVectorStoreClient(vectorStore) {
			vectorStore.client?.release();
		},
	};
}

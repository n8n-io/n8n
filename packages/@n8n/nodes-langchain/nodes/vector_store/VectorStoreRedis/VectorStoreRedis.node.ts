import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import {
	FluentRedisVectorStore,
	type FluentRedisVectorStoreConfig,
	type FilterExpression,
	type MetadataFieldSchema,
	Tag,
	Custom,
} from '@langchain/redis';
import {
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeProperties,
	type ISupplyDataFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import type { RedisClientOptions } from 'redis';
import { createClient } from 'redis';

import { createVectorStoreNode } from '@n8n/ai-utilities';

/**
 * Constants for the name of the credentials and Node parameters.
 */
const REDIS_CREDENTIALS = 'redis';
const REDIS_INDEX_NAME = 'redisIndex';
const REDIS_KEY_PREFIX = 'keyPrefix';
const REDIS_OVERWRITE_DOCUMENTS = 'overwriteDocuments';
const REDIS_METADATA_KEY = 'metadataKey';
const REDIS_METADATA_FILTER = 'metadataFilter';
const REDIS_CUSTOM_FILTER = 'customFilter';
const REDIS_METADATA_SCHEMA = 'metadataSchema';
const REDIS_CONTENT_KEY = 'contentKey';
const REDIS_EMBEDDING_KEY = 'vectorKey';
const REDIS_TTL = 'ttl';

const redisIndexRLC: INodeProperties = {
	displayName: 'Redis Index',
	name: REDIS_INDEX_NAME,
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'redisIndexSearch',
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
		},
	],
};

const metadataFilterField: INodeProperties = {
	displayName: 'Metadata Filter',
	name: REDIS_METADATA_FILTER,
	type: 'string',
	description:
		'Comma-separated list of words for simple tag-based metadata filtering. For advanced filtering, use Custom Filter instead.',
	placeholder: 'Item1,Item2,Item3',
	default: '',
};

const customFilterField: INodeProperties = {
	displayName: 'Custom Filter',
	name: REDIS_CUSTOM_FILTER,
	type: 'string',
	description:
		'Advanced Redis query filter expression. Supports Tag, Numeric, Text, Geo filters with AND/OR logic. Example: <code>@category:{electronics} @price:[0 100]</code>. Leave empty to use simple Metadata Filter.',
	placeholder: '@category:{electronics} @price:[0 100]',
	default: '',
	typeOptions: {
		rows: 3,
	},
};

const metadataSchemaField: INodeProperties = {
	displayName: 'Metadata Schema',
	name: REDIS_METADATA_SCHEMA,
	type: 'string',
	description:
		'JSON array defining metadata field types for indexing. If not provided, schema will be inferred from documents. Example: <code>[{"name": "category", "type": "tag"}, {"name": "price", "type": "numeric", "options": {"sortable": true}}]</code>',
	placeholder: '[{"name": "category", "type": "tag"}, {"name": "price", "type": "numeric"}]',
	default: '',
	typeOptions: {
		rows: 4,
	},
};

const metadataKeyField: INodeProperties = {
	displayName: 'Metadata Key',
	name: REDIS_METADATA_KEY,
	type: 'string',
	description: 'The hash key to be used to store the metadata of the document',
	placeholder: 'metadata',
	default: '',
};

const contentKeyField: INodeProperties = {
	displayName: 'Content Key',
	name: REDIS_CONTENT_KEY,
	type: 'string',
	description: 'The hash key to be used to store the content of the document',
	placeholder: 'content',
	default: '',
};

const embeddingKeyField: INodeProperties = {
	displayName: 'Embedding Key',
	name: REDIS_EMBEDDING_KEY,
	type: 'string',
	description: 'The hash key to be used to store the embedding of the document',
	placeholder: 'content_vector',
	default: '',
};

const overwriteDocuments: INodeProperties = {
	displayName: 'Overwrite Documents',
	name: REDIS_OVERWRITE_DOCUMENTS,
	type: 'boolean',
	description: 'Whether existing documents and the index should be overwritten',
	default: false,
};

const keyPrefixField: INodeProperties = {
	displayName: 'Key Prefix',
	name: REDIS_KEY_PREFIX,
	type: 'string',
	description: 'Prefix for Redis keys storing the documents',
	placeholder: 'doc',
	default: '',
};

const ttlField: INodeProperties = {
	displayName: 'Time-To-Live',
	name: REDIS_TTL,
	description: 'Time-to-live for the documents in seconds',
	placeholder: '0',
	type: 'number',
	default: '',
};

const sharedFields: INodeProperties[] = [redisIndexRLC];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			keyPrefixField,
			overwriteDocuments,
			metadataKeyField,
			metadataSchemaField,
			contentKeyField,
			embeddingKeyField,
			ttlField,
		],
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
			metadataFilterField,
			customFilterField,
			keyPrefixField,
			metadataKeyField,
			contentKeyField,
			embeddingKeyField,
		],
	},
];

export const redisConfig = {
	client: null as ReturnType<typeof createClient> | null,
	connectionString: '',
};

/**
 * Type used for cleaner, more intentional typing.
 */
type IFunctionsContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

/**
 * Get the Redis client.
 * @param context - The context.
 * @returns the Redis client for the node.
 */
export async function getRedisClient(
	context: IFunctionsContext,
): Promise<ReturnType<typeof createClient> | null> {
	const credentials = await context.getCredentials(REDIS_CREDENTIALS);

	// Create client configuration object
	const config: RedisClientOptions = {
		socket: {
			host: (credentials.host as string) || 'localhost',
			port: (credentials.port as number) || 6379,
			tls: credentials.ssl === true,
		},
		username: credentials.user as string,
		password: credentials.password as string,
		database: credentials.database as number,
		clientInfoTag: 'n8n',
	};

	if (!redisConfig.client || redisConfig.connectionString !== JSON.stringify(config)) {
		if (redisConfig.client) {
			await redisConfig.client.disconnect();
		}

		redisConfig.connectionString = JSON.stringify(config);
		redisConfig.client = createClient(config);

		if (redisConfig.client) {
			redisConfig.client.on('error', (error: Error) => {
				context.logger.error(`[Redis client] ${error.message}`, { error });
			});

			await redisConfig.client.connect();
		}
	}

	return redisConfig.client;
}

/**
 * Type guard to check if a value is a string array.
 * @param value - The value to check.
 * @returns True if the value is a string array, false otherwise.
 */
function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Get the complete list of indexes from Redis.
 * @returns The list of indexes.
 */
export async function listIndexes(this: ILoadOptionsFunctions) {
	const client = await getRedisClient(this);

	if (client === null) {
		return { results: [] };
	}

	try {
		// Get all indexes using FT._LIST command
		const indexes = await client.ft._list();

		// Validate that indexes is actually a string array
		if (!isStringArray(indexes)) {
			this.logger.warn('FT._LIST returned unexpected data type');
			return { results: [] };
		}

		const results = indexes.map((index) => ({
			name: index,
			value: index,
		}));

		return { results };
	} catch (error) {
		this.logger.info('Failed to get Redis indexes: ' + error.message);
		return { results: [] };
	}
}

/**
 * Get a parameter from the context.
 * @param key - The key of the parameter.
 * @param context - The context.
 * @param itemIndex - The index.
 * @returns The value.
 */
export function getParameter(key: string, context: IFunctionsContext, itemIndex: number): string {
	return context.getNodeParameter(key, itemIndex, '', {
		extractValue: true,
	}) as string;
}

/**
 * Get a parameter from the context as a number.
 * @param key - The key of the parameter.
 * @param context - The context.
 * @param itemIndex - The index.
 * @returns The value.
 */
export function getParameterAsNumber(
	key: string,
	context: IFunctionsContext,
	itemIndex: number,
): number {
	return context.getNodeParameter(key, itemIndex, '', {
		extractValue: true,
	}) as number;
}

/**
 * Extended FluentRedisVectorStore class to handle custom filtering.
 *
 * This wrapper is necessary because when used as a retriever, the similaritySearchVectorWithScore should
 * use a processed filter
 */
class ExtendedRedisVectorSearch extends FluentRedisVectorStore {
	defaultFilter?: FilterExpression;

	constructor(
		embeddings: EmbeddingsInterface,
		options: FluentRedisVectorStoreConfig,
		filter?: FilterExpression,
	) {
		super(embeddings, options);
		this.defaultFilter = filter;
	}

	async similaritySearchVectorWithScore(query: number[], k: number) {
		return await super.similaritySearchVectorWithScore(query, k, this.defaultFilter);
	}
}

const getIndexName = getParameter.bind(null, REDIS_INDEX_NAME);
const getKeyPrefix = getParameter.bind(null, `options.${REDIS_KEY_PREFIX}`);
const getOverwrite = getParameter.bind(null, `options.${REDIS_OVERWRITE_DOCUMENTS}`);
const getContentKey = getParameter.bind(null, `options.${REDIS_CONTENT_KEY}`);
const getMetadataFilter = getParameter.bind(null, `options.${REDIS_METADATA_FILTER}`);
const getCustomFilter = getParameter.bind(null, `options.${REDIS_CUSTOM_FILTER}`);
const getMetadataSchema = getParameter.bind(null, `options.${REDIS_METADATA_SCHEMA}`);
const getMetadataKey = getParameter.bind(null, `options.${REDIS_METADATA_KEY}`);
const getEmbeddingKey = getParameter.bind(null, `options.${REDIS_EMBEDDING_KEY}`);
const getTtl = getParameterAsNumber.bind(null, `options.${REDIS_TTL}`);

/**
 * Parse and validate metadata schema JSON
 */
function parseMetadataSchema(
	context: IExecuteFunctions | ISupplyDataFunctions,
	schemaJson: string,
	itemIndex: number,
): MetadataFieldSchema[] | undefined {
	if (!schemaJson || !schemaJson.trim()) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(schemaJson);

		// Validate it's an array
		if (!Array.isArray(parsed)) {
			throw new Error('Metadata schema must be a JSON array');
		}

		// Validate each field has required properties
		for (const field of parsed) {
			if (!field.name || typeof field.name !== 'string') {
				throw new Error('Each schema field must have a "name" property');
			}
			if (!field.type || !['tag', 'text', 'numeric', 'geo'].includes(field.type)) {
				throw new Error(
					`Invalid field type "${field.type}". Must be one of: tag, text, numeric, geo`,
				);
			}
		}

		return parsed as MetadataFieldSchema[];
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid metadata schema JSON: ${error.message}`,
			{ itemIndex },
		);
	}
}

export class VectorStoreRedis extends createVectorStoreNode({
	meta: {
		displayName: 'Redis Vector Store',
		name: 'vectorStoreRedis',
		description: 'Work with your data in a Redis vector index',
		icon: { light: 'file:redis.svg', dark: 'file:redis.dark.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreredis/',
		credentials: [
			{
				name: REDIS_CREDENTIALS,
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: { listSearch: { redisIndexSearch: listIndexes } },
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const client = await getRedisClient(context);
		const indexField = getIndexName(context, itemIndex).trim();
		const keyPrefixField = getKeyPrefix(context, itemIndex).trim();
		const metadataField = getMetadataKey(context, itemIndex).trim();
		const contentField = getContentKey(context, itemIndex).trim();
		const embeddingField = getEmbeddingKey(context, itemIndex).trim();
		const customFilter = getCustomFilter(context, itemIndex).trim();
		const simpleFilter = getMetadataFilter(context, itemIndex).trim();
		const metadataSchemaJson = getMetadataSchema(context, itemIndex).trim();

		if (client === null) {
			throw new NodeOperationError(context.getNode(), 'Redis client not initialized', {
				itemIndex,
				description: 'Please check your Redis connection details',
			});
		}

		// Check if index exists by trying to get info about it
		try {
			await client.ft.info(indexField);
		} catch (error) {
			throw new NodeOperationError(context.getNode(), `Index ${indexField} not found`, {
				itemIndex,
				description: 'Please check that the index exists in your Redis instance',
			});
		}

		// Parse custom metadata schema if provided
		const customSchema = parseMetadataSchema(context, metadataSchemaJson, itemIndex);

		// Process filter: custom filter takes priority over simple filter
		let filterExpression: FilterExpression | undefined;

		if (customFilter) {
			// Use custom filter if provided
			filterExpression = Custom(customFilter);
		} else if (simpleFilter) {
			// Fall back to simple tag-based filter
			const filterTerms = simpleFilter
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s);

			if (filterTerms.length > 0) {
				filterExpression = Tag(metadataField || 'metadata').eq(filterTerms);
			}
		}

		return new ExtendedRedisVectorSearch(
			embeddings,
			{
				redisClient: client,
				indexName: indexField,
				...(keyPrefixField ? { keyPrefix: keyPrefixField } : {}),
				...(metadataField ? { metadataKey: metadataField } : {}),
				...(contentField ? { contentKey: contentField } : {}),
				...(embeddingField ? { vectorKey: embeddingField } : {}),
				...(customSchema ? { customSchema } : {}),
			},
			filterExpression,
		);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const client = await getRedisClient(context);

		if (client === null) {
			throw new NodeOperationError(context.getNode(), 'Redis client not initialized', {
				itemIndex,
				description: 'Please check your Redis connection details',
			});
		}

		try {
			const indexField = getIndexName(context, itemIndex).trim();
			const overwrite = getOverwrite(context, itemIndex);
			const keyPrefixField = getKeyPrefix(context, itemIndex).trim();
			const metadataField = getMetadataKey(context, itemIndex).trim();
			const contentField = getContentKey(context, itemIndex).trim();
			const embeddingField = getEmbeddingKey(context, itemIndex).trim();
			const ttl = getTtl(context, itemIndex);
			const metadataSchemaJson = getMetadataSchema(context, itemIndex).trim();

			// Parse custom metadata schema if provided
			const customSchema = parseMetadataSchema(context, metadataSchemaJson, itemIndex);

			if (overwrite) {
				await client.ft.dropIndex(indexField, { DD: true });
			}

			await ExtendedRedisVectorSearch.fromDocuments(documents, embeddings, {
				redisClient: client,
				indexName: indexField,
				...(keyPrefixField ? { keyPrefix: keyPrefixField } : {}),
				...(metadataField ? { metadataKey: metadataField } : {}),
				...(contentField ? { contentKey: contentField } : {}),
				...(embeddingField ? { vectorKey: embeddingField } : {}),
				...(ttl ? { ttl } : {}),
				...(customSchema ? { customSchema } : {}),
			});
		} catch (error) {
			context.logger.info(`Error while populating the store: ${error.message}`);
			throw new NodeOperationError(context.getNode(), `Error: ${error.message}`, {
				itemIndex,
				description: 'Please check your index/schema and parameters',
			});
		}
	},
}) {}

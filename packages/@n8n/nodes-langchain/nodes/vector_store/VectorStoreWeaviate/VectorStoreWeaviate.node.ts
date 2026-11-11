import { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { WeaviateLibArgs as OriginalWeaviateLibArgs } from '@langchain/weaviate';
import { WeaviateStore } from '@langchain/weaviate';
import {
	jsonParse,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { type MetadataKeys, type TimeoutParams, type WeaviateClient } from 'weaviate-client';
import { UnexpectedError } from '@n8n/errors';

import type { WeaviateCompositeFilter, WeaviateCredential } from './Weaviate.utils';
import { createWeaviateClient, parseCompositeFilter } from './Weaviate.utils';
import { createVectorStoreNode } from '@n8n/ai-utilities';
import { isRecord } from '@n8n/utils/is-record';
import { weaviateCollectionsSearch } from '../shared/methods/listSearch';
import { weaviateCollectionRLC } from '../shared/descriptions';

type WeaviateLibArgs = OriginalWeaviateLibArgs & {
	hybridQuery?: string;
	autoCutLimit?: number;
	alpha?: number;
	queryProperties?: string;
	maxVectorDistance?: number;
	fusionType?: 'Ranked' | 'RelativeScore';
	hybridExplainScore?: boolean;
};

class ExtendedWeaviateVectorStore extends WeaviateStore {
	private defaultFilter?: WeaviateCompositeFilter;
	private args!: WeaviateLibArgs;

	static async fromExistingCollection(
		embeddings: Embeddings,
		args: WeaviateLibArgs,
		defaultFilter?: WeaviateCompositeFilter,
	): Promise<ExtendedWeaviateVectorStore> {
		// Call parent factory method but bound to this (subclass) so the created instance is of the subclass
		const ctor = this as unknown as typeof ExtendedWeaviateVectorStore & typeof WeaviateStore;
		const baseCandidate = await ctor.fromExistingIndex(embeddings, args);

		if (!(baseCandidate instanceof ExtendedWeaviateVectorStore)) {
			throw new UnexpectedError(
				'Weaviate store factory did not return an ExtendedWeaviateVectorStore instance',
			);
		}

		const base = baseCandidate;

		// Attach per-instance config
		base.args = args;
		if (defaultFilter) {
			base.defaultFilter = defaultFilter;
		}

		return base;
	}

	async similaritySearchVectorWithScore(query: number[], k: number, filter?: IDataObject) {
		filter = filter ?? this.defaultFilter;
		const args = this.args;

		if (args.hybridQuery) {
			const returnMetadata: MetadataKeys | undefined = args.hybridExplainScore
				? ['explainScore']
				: undefined;
			const options = {
				limit: k ?? undefined,
				autoLimit: args.autoCutLimit ?? undefined,
				alpha: args.alpha ?? undefined,
				vector: query,
				filters: filter ? parseCompositeFilter(filter as WeaviateCompositeFilter) : undefined,
				queryProperties: args.queryProperties
					? args.queryProperties.split(',').map((prop) => prop.trim())
					: undefined,
				maxVectorDistance: args.maxVectorDistance ?? undefined,
				fusionType: args.fusionType,
				returnMetadata,
			};
			const content = await super.hybridSearch(args.hybridQuery, options);
			return content.map((doc) => {
				const { score, ...metadata } = doc.metadata;
				if (typeof score !== 'number') {
					throw new UnexpectedError(`Unexpected score type: ${typeof score}`);
				}
				return [
					new Document({
						pageContent: doc.pageContent,
						metadata,
					}),
					score,
				] as [Document, number];
			});
		}
		return await super.similaritySearchVectorWithScore(
			query,
			k,
			filter ? parseCompositeFilter(filter as WeaviateCompositeFilter) : undefined,
		);
	}
}

/** Deletes the collection, or only the tenant when one is given. */
async function clearCollection(client: WeaviateClient, collectionName: string, tenant?: string) {
	if (!tenant) {
		await client.collections.delete(collectionName);
	} else {
		await client.collections.get(collectionName).tenants.remove([{ name: tenant }]);
	}
}

type CollectionSchema = Parameters<WeaviateClient['collections']['createFromJson']>[0];

type InsertOptions = {
	tenant?: string;
	textKey?: string;
	clearStore?: boolean;
	metadataKeys?: string;
	jsonSchema?: string | IDataObject;
};

/** Parses the "Collection JSON Schema" option, and sets the class to the collection name. */
function parseCollectionSchema(
	context: IExecuteFunctions | ISupplyDataFunctions,
	collectionName: string,
	jsonSchema: InsertOptions['jsonSchema'],
	itemIndex: number,
): CollectionSchema | undefined {
	if (!jsonSchema) return undefined;

	let schema: unknown;
	try {
		schema = typeof jsonSchema === 'string' ? jsonParse<unknown>(jsonSchema) : jsonSchema;
	} catch {
		throw new NodeOperationError(
			context.getNode(),
			'The collection JSON schema is not valid JSON',
			{
				itemIndex,
			},
		);
	}
	if (!isCollectionSchema(schema)) {
		throw new NodeOperationError(
			context.getNode(),
			'The collection JSON schema must be an object',
			{
				itemIndex,
			},
		);
	}
	if (schema.class && schema.class !== collectionName) {
		throw new NodeOperationError(
			context.getNode(),
			'The "class" in the collection JSON schema must match the collection name',
			{ itemIndex },
		);
	}
	// Copy, so that the node parameter does not change
	return { ...schema, class: collectionName };
}

function isCollectionSchema(value: unknown): value is CollectionSchema {
	return isRecord(value) && (value.class === undefined || typeof value.class === 'string');
}

/**
 * Clears the store if the user asks for it, and then creates the collection from
 * the schema if it does not exist. LangChain then only inserts the documents.
 */
async function prepareCollection(
	context: IExecuteFunctions | ISupplyDataFunctions,
	client: WeaviateClient,
	collectionName: string,
	options: InsertOptions,
	itemIndex: number,
) {
	// Parse first, so that an invalid schema does not clear the store
	const schema = parseCollectionSchema(context, collectionName, options.jsonSchema, itemIndex);

	if (options.clearStore) {
		await clearCollection(client, collectionName, options.tenant);
	}
	if (schema && !(await client.collections.exists(collectionName))) {
		await client.collections.createFromJson(schema);
	}
}

const sharedFields: INodeProperties[] = [weaviateCollectionRLC];

const shared_options: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection> = [
	{
		displayName: 'Tenant Name',
		name: 'tenant',
		type: 'string',
		default: '',
		validateType: 'string',
		description: 'Tenant Name. Collection must have been created with tenant support enabled.',
	},
	{
		displayName: 'Text Key',
		name: 'textKey',
		type: 'string',
		default: 'text',
		validateType: 'string',
		description: 'The key in the document that contains the embedded text',
	},
	{
		displayName: 'Skip Init Checks',
		name: 'skip_init_checks',
		type: 'boolean',
		default: false,
		validateType: 'boolean',
		description: 'Whether to skip init checks while instantiating the client',
	},
	{
		displayName: 'Init Timeout',
		name: 'timeout_init',
		type: 'number',
		default: 2,
		validateType: 'number',
		description: 'Number of timeout seconds for initial checks',
	},
	{
		displayName: 'Insert Timeout',
		name: 'timeout_insert',
		type: 'number',
		default: 90,
		validateType: 'number',
		description: 'Number of timeout seconds for inserts',
	},
	{
		displayName: 'Query Timeout',
		name: 'timeout_query',
		type: 'number',
		default: 30,
		validateType: 'number',
		description: 'Number of timeout seconds for queries',
	},
	{
		displayName: 'GRPC Proxy',
		name: 'proxy_grpc',
		type: 'string',
		default: '',
		validateType: 'string',
		description:
			'Proxy to use for GRPC. Applies only when the credential has no gRPC proxy, and needs "Custom Connection gRPC Secure" when the credential has an API key.',
		hint: 'Set the gRPC proxy in the Weaviate credential instead',
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
			...shared_options,
			{
				displayName: 'Clear Data',
				name: 'clearStore',
				type: 'boolean',
				default: false,
				description: 'Whether to clear the Collection/Tenant before inserting new data',
			},
			{
				displayName: 'Collection JSON Schema',
				name: 'jsonSchema',
				type: 'json',
				typeOptions: {
					rows: 5,
				},
				default: '',
				description:
					'Weaviate collection definition. The node uses it to create the collection when the collection does not exist. Use the JSON from the Weaviate REST API or from <code>client.collections.exportToJson()</code>, or make it with the <a href="https://weaviate.github.io/weaviate-add-collection/" target="_blank">collection builder</a>. The "class" in the schema must be the same as the collection name, or empty. The node ignores the schema when the collection exists.',
			},
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
			{
				displayName: 'Search Filters',
				name: 'searchFilterJson',
				type: 'json',
				typeOptions: {
					rows: 5,
				},
				default:
					'{\n  "OR": [\n    {\n        "path": ["pdf_info_Author"],\n        "operator": "Equal",\n        "valueString": "Elis"\n    },\n    {\n        "path": ["pdf_info_Author"],\n        "operator": "Equal",\n        "valueString": "Pinnacle"\n    }    \n  ]\n}',
				validateType: 'object',
				description:
					'Filter pageContent or metadata using this <a href="https://weaviate.io/" target="_blank">filtering syntax</a>',
			},
			{
				displayName: 'Metadata Keys',
				name: 'metadataKeys',
				type: 'string',
				default: 'source,page',
				validateType: 'string',
				description: 'Select the metadata to retrieve along the content',
			},
			{
				displayName: 'Hybrid: Query Text',
				name: 'hybridQuery',
				type: 'string',
				default: '',
				validateType: 'string',
				description: 'Provide a query text to combine vector search with a keyword/text search',
			},
			{
				displayName: 'Hybrid: Explain Score',
				name: 'hybridExplainScore',
				type: 'boolean',
				default: false,
				validateType: 'boolean',
				description: 'Whether to show the score fused between hybrid and vector search explanation',
			},
			{
				displayName: 'Hybrid: Fusion Type',
				name: 'fusionType',
				type: 'options',
				options: [
					{
						name: 'Relative Score',
						value: 'RelativeScore',
					},
					{
						name: 'Ranked',
						value: 'Ranked',
					},
				],
				default: 'RelativeScore',
				description: 'Select the fusion type for combining vector and keyword search results',
			},
			{
				displayName: 'Hybrid: Auto Cut Limit',
				name: 'autoCutLimit',
				type: 'number',
				default: undefined,
				validateType: 'number',
				description: 'Limit result groups by detecting sudden jumps in score',
			},
			{
				displayName: 'Hybrid: Alpha',
				name: 'alpha',
				type: 'number',
				default: 0.5,
				validateType: 'number',
				description:
					'Change the relative weights of the keyword and vector components. 1.0 = pure vector, 0.0 = pure keyword.',
			},
			{
				displayName: 'Hybrid: Query Properties',
				name: 'queryProperties',
				type: 'string',
				default: '',
				validateType: 'string',
				description:
					'Comma-separated list of properties to include in the query with optionally weighted values, e.g., "question^2,answer"',
			},
			{
				displayName: 'Hybrid: Max Vector Distance',
				name: 'maxVectorDistance',
				type: 'number',
				default: undefined,
				validateType: 'number',
				description: 'Set the maximum allowable distance for the vector search component',
			},
			...shared_options,
		],
	},
];

export class VectorStoreWeaviate extends createVectorStoreNode<ExtendedWeaviateVectorStore>({
	meta: {
		displayName: 'Weaviate Vector Store',
		name: 'vectorStoreWeaviate',
		description: 'Work with your data in a Weaviate Cluster',
		icon: 'file:weaviate.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreweaviate/',
		credentials: [
			{
				name: 'weaviateApi',
				required: true,
			},
		],
	},
	methods: {
		listSearch: { weaviateCollectionsSearch },
	},
	loadFields: retrieveFields,
	insertFields,
	sharedFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const collection = context.getNodeParameter('weaviateCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			queryProperties: string;
			maxVectorDistance: number;
			fusionType: 'Ranked' | 'RelativeScore';
			alpha?: number;
			autoCutLimit?: number;
			hybridQuery?: string;
			tenant?: string;
			textKey?: string;
			timeout_init: number;
			timeout_insert: number;
			timeout_query: number;
			skip_init_checks: boolean;
			proxy_grpc: string;
			metadataKeys?: string;
			hybridExplainScore?: boolean;
		};
		// check if textKey is valid

		const credentials = await context.getCredentials('weaviateApi');

		const timeout = {
			query: options.timeout_query,
			init: options.timeout_init,
			insert: options.timeout_insert,
		};

		const client = await createWeaviateClient(
			credentials as WeaviateCredential,
			timeout as TimeoutParams,
			options.proxy_grpc,
			options.skip_init_checks,
		);

		const metadataKeys = options.metadataKeys ? options.metadataKeys.split(',') : [];
		const config: WeaviateLibArgs = {
			client,
			indexName: collection,
			tenant: options.tenant ?? undefined,
			textKey: options.textKey ? options.textKey : 'text',
			metadataKeys: metadataKeys as string[] | undefined,
			hybridQuery: options.hybridQuery ?? undefined,
			autoCutLimit: options.autoCutLimit ?? undefined,
			alpha: options.alpha ?? undefined,
			queryProperties: options.queryProperties,
			maxVectorDistance: options.maxVectorDistance || undefined,
			fusionType: options.fusionType,
			hybridExplainScore: options.hybridExplainScore ?? false,
		};

		const validFilter = (filter && Object.keys(filter).length > 0 ? filter : undefined) as
			| WeaviateCompositeFilter
			| undefined;
		return await ExtendedWeaviateVectorStore.fromExistingCollection(
			embeddings,
			config,
			validFilter,
		);
	},
	// Version 1.1+: runs once before the batches, so that later batches do not delete earlier ones
	async beforeInsert(context, _embeddings, itemIndex) {
		const options = context.getNodeParameter('options', itemIndex, {}) as InsertOptions;
		if (!options.clearStore && !options.jsonSchema) return;

		const collectionName = context.getNodeParameter('weaviateCollection', itemIndex, '', {
			extractValue: true,
		}) as string;
		const credentials = await context.getCredentials('weaviateApi');
		const client = await createWeaviateClient(credentials as WeaviateCredential);

		try {
			await prepareCollection(context, client, collectionName, options, itemIndex);
		} finally {
			// This client is used only to prepare the collection, so release its connections
			await client.close();
		}
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('weaviateCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = context.getNodeParameter('options', itemIndex, {}) as InsertOptions;

		const credentials = await context.getCredentials('weaviateApi');

		const metadataKeys = options.metadataKeys ? options.metadataKeys.split(',') : [];

		const client = await createWeaviateClient(credentials as WeaviateCredential);

		const config: WeaviateLibArgs = {
			client,
			indexName: collectionName,
			tenant: options.tenant ?? undefined,
			textKey: options.textKey ? options.textKey : 'text',
			metadataKeys: metadataKeys as string[] | undefined,
		};

		// From version 1.1, beforeInsert prepares the collection once before the batches
		if (context.getNode().typeVersion < 1.1) {
			await prepareCollection(context, client, collectionName, options, itemIndex);
		}

		await WeaviateStore.fromDocuments(documents, embeddings, config);
	},
}) {}

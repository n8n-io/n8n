import { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { WeaviateLibArgs as OriginalWeaviateLibArgs } from '@langchain/weaviate';
import { WeaviateStore } from '@langchain/weaviate';
import {
	ApplicationError,
	type IDataObject,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
} from 'n8n-workflow';
import { type ProxiesParams, type TimeoutParams } from 'weaviate-client';

import type { WeaviateCompositeFilter, WeaviateCredential } from './Weaviate.utils';
import { createWeaviateClient, parseCompositeFilter } from './Weaviate.utils';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { weaviateCollectionsSearch } from '../shared/createVectorStoreNode/methods/listSearch';
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
			throw new ApplicationError(
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
			const options = {
				limit: k ?? undefined,
				autoLimit: args.autoCutLimit ?? undefined,
				alpha: args.alpha ?? undefined,
				vector: query,
				filter: filter ? parseCompositeFilter(filter as WeaviateCompositeFilter) : undefined,
				queryProperties: args.queryProperties
					? args.queryProperties.split(',').map((prop) => prop.trim())
					: undefined,
				maxVectorDistance: args.maxVectorDistance ?? undefined,
				fusionType: args.fusionType,
				returnMetadata: args.hybridExplainScore ? ['explainScore'] : undefined,
			};
			const content = await super.hybridSearch(args.hybridQuery, options);
			return content.map((doc) => {
				const { score, ...metadata } = doc.metadata;
				if (typeof score !== 'number') {
					throw new ApplicationError(`Unexpected score type: ${typeof score}`);
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

const sharedFields: INodeProperties[] = [weaviateCollectionRLC];

const shared_options: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection> = [
	{
		displayName: 'Tenant Name',
		name: 'tenant',
		type: 'string',
		default: undefined,
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
		default: undefined,
		validateType: 'string',
		description: 'Proxy to use for GRPC',
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

		const proxies = {
			grpc: options.proxy_grpc,
		};

		const client = await createWeaviateClient(
			credentials as WeaviateCredential,
			timeout as TimeoutParams,
			proxies as ProxiesParams,
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
			maxVectorDistance: options.maxVectorDistance,
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
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collectionName = context.getNodeParameter('weaviateCollection', itemIndex, '', {
			extractValue: true,
		}) as string;

		const options = context.getNodeParameter('options', itemIndex, {}) as {
			tenant?: string;
			textKey?: string;
			clearStore?: boolean;
			metadataKeys?: string;
		};

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

		if (options.clearStore) {
			if (!options.tenant) {
				await client.collections.delete(collectionName);
			} else {
				const collection = client.collections.get(collectionName);
				await collection.tenants.remove([{ name: options.tenant }]);
			}
		}

		await WeaviateStore.fromDocuments(documents, embeddings, config);
	},
}) {}

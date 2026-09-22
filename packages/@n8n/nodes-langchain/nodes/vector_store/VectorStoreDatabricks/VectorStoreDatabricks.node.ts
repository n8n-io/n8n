import type { Embeddings } from '@langchain/core/embeddings';
import { createVectorStoreNode, proxyFetch } from '@n8n/ai-utilities';
import {
	assertParamIsArray,
	assertParamIsString,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	type INodeProperties,
	type INodePropertyOptions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import {
	createDatabricksAuthFetch,
	type DatabricksFetchContext,
} from '@utils/databricks/auth-fetch';
import { assertHttpsHost } from '@utils/databricks/constants';
import { listDatabricksPages } from '@utils/databricks/list-pages';
import {
	DATABRICKS_CREDENTIAL_TYPE,
	type DatabricksOAuth2Credential,
} from '@utils/databricks/token-provider';
import { DatabricksVectorStore, type DatabricksIndexInfo } from './DatabricksVectorStore';

const REQUEST_TIMEOUT_MS = 60_000;

const databricksIndexRLC: INodeProperties = {
	displayName: 'Index',
	name: 'databricksIndex',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select an index...',
			typeOptions: {
				searchListMethod: 'searchIndexes',
				searchable: true,
			},
		},
		{
			displayName: 'Name',
			name: 'id',
			type: 'string',
			placeholder: 'catalog.schema.index',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[^.\\s]+\\.[^.\\s]+\\.[^.\\s]+$',
						errorMessage: 'Use the full name: catalog.schema.index',
					},
				},
			],
		},
	],
};

const columnTypeOptions = {
	loadOptionsMethod: 'getIndexColumns',
	loadOptionsDependsOn: ['databricksIndex.value'],
};

const sharedFields: INodeProperties[] = [
	databricksIndexRLC,
	{
		displayName: 'Content Column',
		name: 'contentColumn',
		type: 'options',
		default: '',
		typeOptions: columnTypeOptions,
		description:
			'Column that becomes the document text. Leave empty on a managed-embedding index to use its embedding source column. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Metadata Columns',
				name: 'metadataColumns',
				type: 'multiOptions',
				default: [],
				typeOptions: columnTypeOptions,
				description:
					'Columns to return in document metadata. Defaults to all columns except the key, content and vector columns. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];

interface Run {
	fetch: typeof fetch;
	host: string;
	/** Describe results of this run, keyed by index name */
	indexes: Map<string, Promise<DatabricksIndexInfo>>;
}

// The class owns its HTTP calls, so the runtime and the column dropdown share
// the token-refreshing fetch; the transport goes through the proxy-aware fetch
async function openRun(ctx: DatabricksFetchContext): Promise<Run> {
	const credential = await ctx.getCredentials<DatabricksOAuth2Credential>(
		DATABRICKS_CREDENTIAL_TYPE,
	);
	assertHttpsHost(ctx, credential.host);
	const host = credential.host.replace(/\/$/, '');
	const egressFilter = ctx.helpers.getSecureEgressFilter();
	// ILoadOptionsFunctions has no cancel signal
	const cancelSignal =
		'getExecutionCancelSignal' in ctx ? ctx.getExecutionCancelSignal() : undefined;
	const { fetch } = createDatabricksAuthFetch(ctx, credential, {
		endpointUrl: host,
		egressFilter,
		baseFetch: async (input, init) => {
			// A whole-request deadline on the signal keeps the shared undici pool; per-request
			// timeoutOptions would build a new Agent for every hop. The responses are small JSON
			// bodies, so the deadline covers headers and body alike
			const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
			if (init?.signal) signals.push(init.signal);
			if (cancelSignal) signals.push(cancelSignal);
			return await proxyFetch({
				input,
				init: { ...init, signal: AbortSignal.any(signals) },
				egressFilter,
			});
		},
	});
	return { fetch, host, indexes: new Map() };
}

// One context object serves every item of an execute call and every tool call of a
// supplyData closure, so the token mint and the describe GETs happen once per run
const runs = new WeakMap<DatabricksFetchContext, Promise<Run>>();

async function databricksFetch(ctx: DatabricksFetchContext): Promise<Run> {
	let run = runs.get(ctx);
	if (!run) {
		// Evict a rejected run so a failed credential lookup does not poison the rest of the run
		run = openRun(ctx).catch((error) => {
			runs.delete(ctx);
			throw error;
		});
		runs.set(ctx, run);
	}
	return await run;
}

async function createStore(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	embeddings: Embeddings,
	itemIndex: number,
	filter?: Record<string, unknown>,
): Promise<DatabricksVectorStore> {
	const { fetch, host, indexes } = await databricksFetch(ctx);
	const node = ctx.getNode();
	const indexName = ctx.getNodeParameter('databricksIndex', itemIndex, '', { extractValue: true });
	assertParamIsString('databricksIndex', indexName, node);
	const contentColumn = ctx.getNodeParameter('contentColumn', itemIndex, '');
	assertParamIsString('contentColumn', contentColumn, node);
	const metadataColumns = ctx.getNodeParameter('options.metadataColumns', itemIndex, []);
	assertParamIsArray(
		'metadataColumns',
		metadataColumns,
		(value): value is string => typeof value === 'string',
		node,
	);

	let index = indexes.get(indexName);
	if (!index) {
		// Evict a rejected describe so one transient failure does not poison the rest of the run
		index = DatabricksVectorStore.describeIndex(fetch, host, indexName).catch((error) => {
			indexes.delete(indexName);
			throw error;
		});
		indexes.set(indexName, index);
	}

	return await DatabricksVectorStore.fromExistingIndex(embeddings, {
		fetch,
		host,
		indexName,
		contentColumn,
		metadataColumns,
		filter,
		index: await index,
	});
}

interface ListPage {
	endpoints?: Array<{ name: string }>;
	vector_indexes?: Array<{ name: string; index_type?: string }>;
	next_page_token?: string;
}

async function searchIndexes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<DatabricksOAuth2Credential>(
		DATABRICKS_CREDENTIAL_TYPE,
	);
	assertHttpsHost(this, credentials.host);
	const host = credentials.host.replace(/\/$/, '');

	const endpoints = await listDatabricksPages(
		this,
		`${host}/api/2.0/vector-search/endpoints`,
		{},
		(page: ListPage) => page.endpoints,
	);
	const results = (
		await Promise.all(
			endpoints.map(async (endpoint) => {
				const indexes = await listDatabricksPages(
					this,
					`${host}/api/2.0/vector-search/indexes`,
					{ endpoint_name: endpoint.name },
					(page: ListPage) => page.vector_indexes,
				);
				// The type tells the user which indexes accept inserts
				return indexes.map((index) => ({
					name: index.name,
					value: index.name,
					description: `${index.index_type} - ${endpoint.name}`,
				}));
			}),
		)
	)
		.flat()
		.sort((a, b) => a.name.localeCompare(b.name));

	const filterLower = filter?.toLowerCase();
	return {
		results: filterLower
			? results.filter((result) => result.name.toLowerCase().includes(filterLower))
			: results,
	};
}

async function getIndexColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const indexName = this.getCurrentNodeParameter('databricksIndex', { extractValue: true });
	if (typeof indexName !== 'string' || indexName === '') return [];

	const { fetch, host } = await databricksFetch(this);
	const info = await DatabricksVectorStore.describeIndex(fetch, host, indexName);
	const { embedding } = info;
	const source = embedding.kind === 'managed' ? embedding.sourceColumn : undefined;
	const vector = embedding.kind === 'self' ? embedding.vectorColumn : undefined;
	const columns = (info.schemaColumns ?? [])
		.filter((column) => column !== source && column !== vector)
		.map((column) => ({ name: column, value: column }));
	return source
		? [{ name: source, value: source, description: 'Embedding source column' }, ...columns]
		: columns;
}

export class VectorStoreDatabricks extends createVectorStoreNode<DatabricksVectorStore>({
	meta: {
		displayName: 'Databricks Vector Store',
		name: 'vectorStoreDatabricks',
		description: 'Work with your data in Databricks Vector Search',
		icon: {
			light: 'file:../../shared/icons/databricks.svg',
			dark: 'file:../../shared/icons/databricks.dark.svg',
		},
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoredatabricks/',
		credentials: [
			{
				name: 'databricksOAuth2Api',
				required: true,
			},
		],
	},
	hidden: true,
	// The index decides between query_text and query_vector inside the class
	searchByText: true,
	methods: { listSearch: { searchIndexes }, loadOptions: { getIndexColumns } },
	sharedFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		return await createStore(context, embeddings, itemIndex, filter);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const store = await createStore(context, embeddings, itemIndex);
		await store.addDocuments(documents);
	},
}) {}

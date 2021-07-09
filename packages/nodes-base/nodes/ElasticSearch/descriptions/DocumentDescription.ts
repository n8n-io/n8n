import {
	INodeProperties,
} from 'n8n-workflow';

import * as placeholders from './placeholders';

export const documentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Index',
				value: 'index',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const documentFields = [
	// ----------------------------------------
	//             document: delete
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index containing the document to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		description: 'ID of the document to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//              document: get
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index containing the document to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		description: 'ID of the document to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Source Excludes',
				name: '_source_excludes',
				description: 'Comma-separated list of source fields to exclude from the response.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Source Includes',
				name: '_source_includes',
				description: 'Comma-separated list of source fields to include in the response.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Stored Fields',
				name: 'stored_fields',
				description: 'If true, retrieve the document fields stored in the index rather than the document <code>_source</code>. Defaults to false.',
				type: 'boolean',
				default: false,
			},
		],
	},

	// ----------------------------------------
	//             document: getAll
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index containing the documents to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'The maximum number of results to return.',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Allow No Indices',
				name: 'allow_no_indices',
				description: 'If false, return an error if any of the following targets only missing/closed indices: wildcard expression, index alias, or <code>_all</code> value. Defaults to true.',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Allow Partial Search Results',
				name: 'allow_partial_search_results',
				description: 'If true, return partial results if there are shard request timeouts or shard failures.<br>If false, returns an error with no partial results. Defaults to true.',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Batched Reduce Size',
				name: 'batched_reduce_size',
				description: 'Number of shard results that should be reduced at once on the coordinating node. Defaults to 512.',
				type: 'number',
				typeOptions: {
					minValue: 2,
				},
				default: 512,
			},
			{
				displayName: 'CCS Minimize Roundtrips',
				name: 'ccs_minimize_roundtrips',
				description: 'If true, network round-trips between the coordinating node and the remote clusters are minimized when executing cross-cluster search (CCS) requests. Defaults to true.',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Doc Value Fields',
				name: 'docvalue_fields',
				description: 'Comma-separated list of fields to return as the docvalue representation of a field for each hit.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Expand Wildcards',
				name: 'expand_wildcards',
				description: 'Type of index that wildcard expressions can match. Defaults to <code>open</code>.',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'Hidden',
						value: 'hidden',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Open',
						value: 'open',
					},
				],
				default: 'open',
			},
			{
				displayName: 'Explain',
				name: 'explain',
				description: 'If true, return detailed information about score computation as part of a hit. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Ignore Throttled',
				name: 'ignore_throttled',
				description: 'If true, concrete, expanded or aliased indices are ignored when frozen. Defaults to true.',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Ignore Unavailable',
				name: 'ignore_unavailable',
				description: 'If true, missing or closed indices are not included in the response. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Max Concurrent Shard Requests',
				name: 'max_concurrent_shard_requests',
				description: 'Define the number of shard requests per node this search executes concurrently. Defaults to 5.',
				type: 'number',
				default: 5,
			},
			{
				displayName: 'Pre-Filter Shard Size',
				name: 'pre_filter_shard_size',
				description: 'Define a threshold that enforces a pre-filter roundtrip to prefilter search shards based on query rewriting.<br>Only used if the number of shards the search request expands to exceeds the threshold.',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
			},
			{
				displayName: 'Query',
				name: 'query',
				description: 'Query in the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html" target="_blank">Elasticsearch Query DSL</a>.',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				placeholder: placeholders.query,
			},
			{
				displayName: 'Request Cache',
				name: 'request_cache',
				description: 'If true, the caching of search results is enabled for requests where size is 0. See <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-request-cache.html" target="_blank">Elasticsearch shard request cache settings</a>.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Routing',
				name: 'routing',
				description: 'Target this primary shard.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Search Type',
				name: 'search_type',
				description: 'How distributed term frequencies are calculated for relevance scoring. Defaults to Query then Fetch.',
				type: 'options',
				options: [
					{
						name: 'Query Then Fetch',
						value: 'query_then_fetch',
					},
					{
						name: 'DFS Query Then Fetch',
						value: 'dfs_query_then_fetch',
					},
				],
				default: 'query_then_fetch',
			},
			{
				displayName: 'Sequence Number and Primary Term',
				name: 'seq_no_primary_term',
				description: 'If true, return the sequence number and primary term of the last modification of each hit. See <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html" target="_blank">Optimistic concurrency control</a>.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Sort',
				name: 'sort',
				description: 'Comma-separated list of <code>field:direction</code> pairs.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Stats',
				name: 'stats',
				description: 'Tag of the request for logging and statistical purposes.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Stored Fields',
				name: 'stored_fields',
				description: 'If true, retrieve the document fields stored in the index rather than the document <code>_source</code>. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Terminate After',
				name: 'terminate_after',
				description: 'Max number of documents to collect for each shard.',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				description: 'Period to wait for active shards. Defaults to <code>1m</code> (one minute). See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">Elasticsearch time units reference</a>.',
				type: 'string',
				default: '1m',
			},
			{
				displayName: 'Track Scores',
				name: 'track_scores',
				description: 'If true, calculate and return document scores, even if the scores are not used for sorting. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Track Total Hits',
				name: 'track_total_hits',
				description: 'Number of hits matching the query to count accurately. Defaults to 10000.',
				type: 'number',
				default: 10000,
			},
			{
				displayName: 'Version',
				name: 'version',
				description: 'If true, return document version as part of a hit. Defaults to false.',
				type: 'boolean',
				default: false,
			},
		],
	},

	// ----------------------------------------
	//             document: index
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index to add the document to.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'index',
				],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		description: 'JSON source for the document data.',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		default: '',
		placeholder: placeholders.document,
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'index',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'index',
				],
			},
		},
		options: [
			{
				displayName: 'Document ID',
				name: 'documentId',
				description: 'ID of the document to create and add to the index.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Routing',
				name: 'routing',
				description: 'Target this primary shard.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				description: 'Period to wait for active shards. Defaults to <code>1m</code> (one minute). See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">Elasticsearch time units reference</a>.',
				type: 'string',
				default: '1m',
			},
		],
	},

	// ----------------------------------------
	//             document: update
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the document to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		description: 'ID of the document to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Script',
		name: 'script',
		description: 'Script to update the document. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting-using.html" target="_blank">Elasticsearch guide to writing scripts</a>.',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'ctx._source.my_field = 1',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
	},
] as INodeProperties[];

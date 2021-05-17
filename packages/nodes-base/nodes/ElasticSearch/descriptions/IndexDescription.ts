import {
	INodeProperties,
} from 'n8n-workflow';

import * as placeholders from './placeholders';

export const indexOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'index',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
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
				name: 'Search',
				value: 'search',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const indexFields = [
	// ----------------------------------------
	//              index: create
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index to create.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'index',
				],
				operation: [
					'create',
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
					'index',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Aliases',
				name: 'aliases',
				description: 'Index aliases which include the index, as an <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-aliases.html" target="_blank">alias object</a>.',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				placeholder: placeholders.aliases,
			},
			{
				displayName: 'Include Type Name',
				name: 'include_type_name',
				description: 'If true, a mapping type is expected in the body of mappings. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Mappings',
				name: 'mappings',
				description: 'Mapping for fields in the index, as <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html" target="_blank">mapping object</a>.',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				placeholder: placeholders.mappings,
			},
			{
				displayName: 'Master Timeout',
				name: 'master_timeout',
				description: 'Period to wait for a connection to the master node. If no response is received before the timeout expires,<br>the request fails and returns an error. Defaults to <code>1m</code>. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">ElasticSearch time units reference</a>.',
				type: 'string',
				default: '1m',
			},
			{
				displayName: 'Settings',
				name: 'settings',
				description: 'Configuration options for the index, as an <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html#index-modules-settings" target="_blank">index settings object</a>.',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				placeholder: placeholders.indexSettings,
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				description: 'Period to wait for a response. If no response is received before the timeout expires, the request<br>fails and returns an error. Defaults to <code>30s</code>. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">ElasticSearch time units reference</a>.',
				type: 'string',
				default: '30s',
			},
			{
				displayName: 'Wait for Active Shards',
				name: 'wait_for_active_shards',
				description: 'The number of shard copies that must be active before proceeding with the operation. Set to <code>all</code><br>or any positive integer up to the total number of shards in the index. Default: 1, the primary shard.',
				type: 'string',
				default: '1',
			},
		],
	},

	// ----------------------------------------
	//              index: delete
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'index',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                index: get
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'index',
				],
				operation: [
					'get',
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
					'index',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Allow No Indices',
				name: 'allow_no_indices',
				description: 'If false, the request returns an error if any wildcard expression, index alias,<br>or <code>_all</code> value targets only missing or closed indices. Defaults to true.',
				type: 'boolean',
				default: true,
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
						name: 'Open',
						value: 'open',
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
				],
				default: 'all',
			},
			{
				displayName: 'Flat Settings',
				name: 'flat_settings',
				description: 'If true, return settings in flat format. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Ignore Unavailable',
				name: 'ignore_unavailable',
				description: ' If false, requests that target a missing index return an error. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Defaults',
				name: 'include_defaults',
				description: 'If true, return all default settings in the response. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Local',
				name: 'local',
				description: 'If true, retrieve information from the local node only. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Master Timeout',
				name: 'master_timeout',
				description: 'Period to wait for a connection to the master node. If no response is received before the timeout expires,<br>the request fails and returns an error. Defaults to <code>1m</code>. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">ElasticSearch time units reference</a>.',
				type: 'string',
				default: '1m',
			},
		],
	},

	// ----------------------------------------
	//              index: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'index',
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
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'index',
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

	// ----------------------------------------
	//              index: search
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index to search.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'index',
				],
				operation: [
					'search',
				],
			},
		},
	},
	{
		displayName: 'Query',
		name: 'query',
		description: 'Query in the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html" target="_blank">ElasticSearch Query DSL</a>.',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		placeholder: placeholders.query,
		displayOptions: {
			show: {
				resource: [
					'index',
				],
				operation: [
					'search',
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
					'index',
				],
				operation: [
					'search',
				],
			},
		},
		options: [
			{
				displayName: 'Allow No Indices',
				name: 'allow_no_indices',
				description: 'If false, return an error if any wildcard expression, index alias, or <code>_all</code> value targets only missing or closed indices. Defaults to true.',
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
				displayName: 'Docvalue Fields',
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
				default: 'all',
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
				description: 'Define the number of concurrent shard requests per node this search executes concurrently. Defaults to 5.',
				type: 'number',
				default: 5,
			},
			{
				displayName: 'Pre-Filter Shard Size',
				name: 'pre_filter_shard_size',
				description: 'Define a threshold that enforces a pre-filter roundtrip to prefilter search shards based on query rewriting<br>if the number of shards the search request expands to exceeds the threshold.',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 0,
			},
			{
				displayName: 'Request Cache',
				name: 'request_cache',
				description: 'If true, the caching of search results is enabled for requests where size is 0. See <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-request-cache.html" target="_blank">ElasticSearch shard request cache settings</a>.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Rest Total Hits as Integer',
				name: 'rest_total_hits_as_int',
				description: 'Whether <code>hits.total</code> should be rendered as an integer or an object in the rest search response. Defaults to false.',
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
				displayName: 'Size',
				name: 'size',
				description: 'Define the number of hits to return. Defaults to 10.',
				type: 'number',
				default: 10,
			},
			{
				displayName: 'Sort',
				name: 'sort',
				description: 'Comma-separated list of <code>field:direction</code> pairs.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Source',
				name: '_source',
				description: 'Whether to include the <code>_source</code> field.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Source Excludes',
				name: '_source_excludes',
				description: 'Comma-separated list of source fields to exclude from the response. If the <code>_source</code> parameter is false, this parameter is ignored.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Source Includes',
				name: '_source_includes',
				description: 'Comma-separated list of source fields to include in the response. If the <code>_source</code> parameter is false, this parameter is ignored.',
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
				displayName: 'Suggest Field',
				name: 'suggest_field',
				description: 'Field to use for suggestions.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Suggest Text',
				name: 'suggest_text',
				description: 'Source text for which the suggestions should be returned.',
				type: 'string',
				default: '',
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
				description: 'Period to wait for active shards. Defaults to <code>1m</code> (one minute). See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">ElasticSearch time units reference</a>.',
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
] as INodeProperties[];

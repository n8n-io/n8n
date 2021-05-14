import {
	INodeProperties,
} from 'n8n-workflow';

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
		default: 'get',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const indexFields = [
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

	// ----------------------------------------
	//              index: getAll
	// ----------------------------------------
	{
		displayName: 'Allow No Indices',
		name: 'allowNoIndices',
		description: 'If false, the request returns an error if any wildcard expression, index alias, or <code>_all</code> value targets only missing or closed indices. Defaults to true.',
		type: 'boolean',
		default: true,
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
		displayName: 'Expand Wildcards',
		name: 'expandWildcards',
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
		displayName: 'Flat Settings',
		name: 'flatSettings',
		description: 'If true, return settings in flat format. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Ignore Unavailable',
		name: 'ignoreUnavailable',
		description: ' If false, requests that target a missing index return an error. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Include Defaults',
		name: 'includeDefaults',
		description: 'If true, return all default settings in the response. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Local',
		name: 'local',
		description: ' If true, retrieve information from the local node only. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Master Timeout',
		name: 'masterTimeout',
		description: 'Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. Defaults to <code>1m</code>. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units">time units reference</a>.',
		type: 'string',
		default: '',
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
		description: '',
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
		displayName: ' Source',
		name: 'source',
		description: 'Whether to include the <code>_source</code> field.',
		type: 'boolean',
		default: false,
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
		displayName: ' Source Excludes',
		name: 'sourceExcludes',
		description: 'Comma-separated list of source fields to exclude from the response. If the <code>_source</code> parameter is false, this parameter is ignored.',
		type: 'string',
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
		displayName: ' Source Includes',
		name: 'sourceIncludes',
		description: 'Comma-separated list of source fields to include in the response. If the <code>_source</code> parameter is false, this parameter is ignored.',
		type: 'string',
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
		displayName: 'Allow No Indices',
		name: 'allowNoIndices',
		description: 'If false, return an error if any wildcard expression, index alias, or <code>_all</code> value targets only missing or closed indices. Defaults to true.',
		type: 'boolean',
		default: true,
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
		displayName: 'Allow Partial Search Results',
		name: 'allowPartialSearchResults',
		description: 'If true, return partial results if there are shard request timeouts or shard failures. If false, returns an error with no partial results. Defaults to true.',
		type: 'boolean',
		default: true,
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
		displayName: 'Batched Reduce Size',
		name: 'batchedReduceSize',
		description: 'Number of shard results that should be reduced at once on the coordinating node. Defaults to 512.',
		type: 'number',
		default: 0,
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
		displayName: 'Ccs Minimize Roundtrips',
		name: 'ccsMinimizeRoundtrips',
		description: 'If true, network round-trips between the coordinating node and the remote clusters are minimized when executing cross-cluster search requests. Defaults to true.',
		type: 'boolean',
		default: true,
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
		displayName: 'Docvalue Fields',
		name: 'docvalueFields',
		description: 'Comma-separated list of fields to return as the docvalue representation of a field for each hit.',
		type: 'string',
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
		displayName: 'Expand Wildcards',
		name: 'expandWildcards',
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
		displayName: 'Explain',
		name: 'explain',
		description: 'If true, return detailed information about score computation as part of a hit. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Ignore Throttled',
		name: 'ignoreThrottled',
		description: 'If true, concrete, expanded or aliased indices are ignored when frozen. Defaults to true.',
		type: 'boolean',
		default: true,
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
		displayName: 'Ignore Unavailable',
		name: 'ignoreUnavailable',
		description: 'If true, missing or closed indices are not included in the response. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Max Concurrent Shard Requests',
		name: 'maxConcurrentShardRequests',
		description: 'Define the number of concurrent shard requests per node this search executes concurrently. Defaults to 5.',
		type: 'number',
		default: 0,
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
		displayName: 'Pre Filter Shard Size',
		name: 'preFilterShardSize',
		description: 'Define a threshold that enforces a pre-filter roundtrip to prefilter search shards based on query rewriting if the number of shards the search request expands to exceeds the threshold.',
		type: 'number',
		default: 0,
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
		name: 'q',
		description: 'Query in the <a href="https://www.elastic.co/guide/en/kibana/current/lucene-query.html">Lucene query string syntax</a>.',
		type: 'string',
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
		displayName: 'Request Cache',
		name: 'requestCache',
		description: 'If true, the caching of search results is enabled for requests where size is 0. See <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-request-cache.html">Shard request cache settings</a>. Defaults to index level settings.',
		type: 'boolean',
		default: false,
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
		displayName: 'Rest Total Hits as Int',
		name: 'restTotalHitsAsInt',
		description: 'Whether <code>hits.total</code> should be rendered as an integer or an object in the rest search response. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Routing',
		name: 'routing',
		description: 'Target this primary shard.',
		type: 'string',
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
		displayName: 'Search Type',
		name: 'searchType',
		description: 'How distributed term frequencies are calculated for relevance scoring. Defaults to Query then Fetch.',
		type: 'options',
		options: [
			{
				name: 'Query Then Fetch',
				value: 'query_then_fetch',
				description: 'Distributed term frequencies are calculated locally for each shard running the search.',
			},
			{
				name: 'Dfs Query Then Fetch',
				value: 'dfs_query_then_fetch',
				description: 'Distributed term frequencies are calculated globally with information gathered from all shards running the search.',
			},
		],
		default: 'query_then_fetch',
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
		displayName: 'Seq No Primary Term',
		name: 'seqNoPrimaryTerm',
		description: 'If true, return the sequence number and primary term of the last modification of each hit. See <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html">Optimistic concurrency control</a>.',
		type: 'boolean',
		default: false,
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
		displayName: 'Size',
		name: 'size',
		description: '',
		type: 'Define the number of hits to return. Defaults to 10.',
		default: 10,
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
		displayName: 'Sort',
		name: 'sort',
		description: 'Comma-separated list of <code><field>:<direction></code> pairs.',
		type: 'string',
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
		displayName: 'Stats',
		name: 'stats',
		description: 'Tag of the request for logging and statistical purposes.',
		type: 'string',
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
		displayName: 'Stored Fields',
		name: 'storedFields',
		description: 'If true, retrieve the document fields stored in the index rather than the document <code>_source</code>. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Suggest Field',
		name: 'suggestField',
		description: 'Field to use for suggestions.',
		type: 'string',
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
		displayName: 'Suggest Text',
		name: 'suggestText',
		description: 'Source text for which the suggestions should be returned.',
		type: 'string',
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
		displayName: 'Terminate After',
		name: 'terminateAfter',
		description: 'Max number of documents to collect for each shard.',
		type: 'number',
		default: 0,
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
		displayName: 'Timeout',
		name: 'timeout',
		description: 'Period to wait for active shards. Defaults to <code>1m</code> (one minute). See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units">time units reference</a>.',
		type: 'string',
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
		displayName: 'Track Scores',
		name: 'trackScores',
		description: 'If true, calculate and return document scores, even if the scores are not used for sorting. Defaults to false.',
		type: 'boolean',
		default: false,
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
		displayName: 'Track Total Hits',
		name: 'trackTotalHits',
		description: 'Number of hits matching the query to count accurately. Defaults to 10000.',
		type: 'number',
		default: 10000,
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
		displayName: 'Version',
		name: 'version',
		description: 'If true, return document version as part of a hit. Defaults to false.',
		type: 'boolean',
		default: false,
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
] as INodeProperties[];

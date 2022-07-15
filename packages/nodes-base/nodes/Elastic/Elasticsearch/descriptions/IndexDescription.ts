import {
	INodeProperties,
} from 'n8n-workflow';

import * as placeholders from './placeholders';

export const indexOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				action: 'Create an index',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an index',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an index',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all indices',
			},
		],
		default: 'create',
	},
];

export const indexFields: INodeProperties[] = [
	// ----------------------------------------
	//              index: create
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the index to create',
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
				description: 'Index aliases which include the index, as an <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-aliases.html">alias object</a>',
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
				description: 'Whether a mapping type is expected in the body of mappings. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Mappings',
				name: 'mappings',
				description: 'Mapping for fields in the index, as <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html">mapping object</a>',
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
				description: 'Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. Defaults to <code>1m</code>. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units">Elasticsearch time units reference</a>',
				type: 'string',
				default: '1m',
			},
			{
				displayName: 'Settings',
				name: 'settings',
				description: 'Configuration options for the index, as an <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html#index-modules-settings">index settings object</a>',
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
				description: 'Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. Defaults to <code>30s</code>. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units">Elasticsearch time units reference</a>',
				type: 'string',
				default: '30s',
			},
			{
				displayName: 'Wait for Active Shards',
				name: 'wait_for_active_shards',
				description: 'The number of shard copies that must be active before proceeding with the operation. Set to <code>all</code> or any positive integer up to the total number of shards in the index. Default: 1, the primary shard',
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
		description: 'ID of the index to delete',
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
		description: 'ID of the index to retrieve',
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
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'If false, return an error if any of the following targets only missing/closed indices: wildcard expression, index alias, or <code>_all</code> value. Defaults to true.',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Expand Wildcards',
				name: 'expand_wildcards',
				description: 'Type of index that wildcard expressions can match. Defaults to <code>open</code>',
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
				displayName: 'Flat Settings',
				name: 'flat_settings',
				description: 'Whether to return settings in flat format. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Ignore Unavailable',
				name: 'ignore_unavailable',
				description: 'Whether to request that target a missing index return an error. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Include Defaults',
				name: 'include_defaults',
				description: 'Whether to return all default settings in the response. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Local',
				name: 'local',
				description: 'Whether to retrieve information from the local node only. Defaults to false.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Master Timeout',
				name: 'master_timeout',
				description: 'Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. Defaults to <code>1m</code>. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units">Elasticsearch time units reference</a>',
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
		description: 'Whether to return all results or only up to a given limit',
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
		description: 'Max number of results to return',
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
];

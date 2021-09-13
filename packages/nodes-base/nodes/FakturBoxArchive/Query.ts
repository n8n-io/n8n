import {
	INodeProperties,
} from 'n8n-workflow';

export const queryOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
			},
		},
		options: [
			{
				name: 'getQueryResultSet',
				value: 'getqueryresultset',
				description: 'Returns Result of a query',
			},
			{
				name: 'getSavedQueries',
				value: 'getsavedqueries',
				description: 'Returns a List of saved Queries'
			},
		],
		default: 'getqueryresultset',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const queryFields = [
	{
		displayName: 'QueryDetails',
		name: 'querydetails',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'getqueryresultset',
				],
				resource: [
					'query',
				],
			},
		},
		default: '',
		description: 'QueryDetails of this query',
	},
	{
		displayName: 'PageSize',
		name: 'pagesize',
		required: true,
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getqueryresultset',
				],
				resource: [
					'query',
				],
			},
		},
		default: 25,
		description: 'PageSize of this query',
	},
	{
		displayName: 'PageNumber',
		name: 'pagenumber',
		required: true,
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getqueryresultset',
				],
				resource: [
					'query',
				],
			},
		},
		default: '',
		description: 'PageNumber of this query',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'getsavedqueries',
				],
				resource: [
					'query',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'FilterByQueryType',
				name: 'filterbyquerytype',
				type: 'string',
				default: '',
			},
			{
				displayName: 'FilterByUsersAndQueriesId',
				name: 'filterbyusersandqueriesid',
				type: 'number',
				default: '',
			},
			{
				displayName: 'IncludeQueryDetails',
				name: 'includequerydetails',
				type: 'boolean',
				default: true,
			},
		],
	},
] as INodeProperties[]
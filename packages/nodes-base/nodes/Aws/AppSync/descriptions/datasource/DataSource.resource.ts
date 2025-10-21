import type { INodeProperties } from 'n8n-workflow';

export const dataSourceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['dataSource'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a data source',
				action: 'Create a data source',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources',
						body: {
							name: '={{ $parameter["dataSourceName"] }}',
							type: '={{ $parameter["dataSourceType"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a data source',
				action: 'Delete a data source',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources/{{ $parameter["dataSourceName"] }}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a data source',
				action: 'Get a data source',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources/{{ $parameter["dataSourceName"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List data sources for an API',
				action: 'List data sources',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a data source',
				action: 'Update a data source',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/datasources/{{ $parameter["dataSourceName"] }}',
					},
				},
			},
		],
		default: 'list',
	},
];

export const dataSourceFields: INodeProperties[] = [
	{
		displayName: 'API ID',
		name: 'apiId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['dataSource'],
			},
		},
		default: '',
		description: 'The API identifier',
	},
	{
		displayName: 'Data Source Name',
		name: 'dataSourceName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create', 'delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'The name of the data source',
	},
	{
		displayName: 'Data Source Type',
		name: 'dataSourceType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'AWS Lambda', value: 'AWS_LAMBDA' },
			{ name: 'Amazon DynamoDB', value: 'AMAZON_DYNAMODB' },
			{ name: 'Amazon OpenSearch Service', value: 'AMAZON_OPENSEARCH_SERVICE' },
			{ name: 'Amazon EventBridge', value: 'AMAZON_EVENTBRIDGE' },
			{ name: 'HTTP Endpoint', value: 'HTTP' },
			{ name: 'Relational Database', value: 'RELATIONAL_DATABASE' },
			{ name: 'None', value: 'NONE' },
		],
		default: 'NONE',
		description: 'The type of data source',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Service Role ARN',
				name: 'serviceRoleArn',
				type: 'string',
				default: '',
				description: 'IAM service role ARN',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the data source',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 25,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'nextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
		],
	},
];

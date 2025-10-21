import type { INodeProperties } from 'n8n-workflow';

export const apiOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['api'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new GraphQL API',
				action: 'Create an API',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/apis',
						body: {
							name: '={{ $parameter["apiName"] }}',
							authenticationType: '={{ $parameter["authenticationType"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a GraphQL API',
				action: 'Delete an API',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v1/apis/{{ $parameter["apiId"] }}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about an API',
				action: 'Get an API',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apis/{{ $parameter["apiId"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all GraphQL APIs',
				action: 'List APIs',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/apis',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an API',
				action: 'Update an API',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/apis/{{ $parameter["apiId"] }}',
					},
				},
			},
		],
		default: 'list',
	},
];

export const apiFields: INodeProperties[] = [
	{
		displayName: 'API ID',
		name: 'apiId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['api'],
				operation: ['delete', 'get', 'update'],
			},
		},
		default: '',
		description: 'The API identifier',
	},
	{
		displayName: 'API Name',
		name: 'apiName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['api'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the API',
	},
	{
		displayName: 'Authentication Type',
		name: 'authenticationType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['api'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'API Key', value: 'API_KEY' },
			{ name: 'AWS IAM', value: 'AWS_IAM' },
			{ name: 'Amazon Cognito User Pools', value: 'AMAZON_COGNITO_USER_POOLS' },
			{ name: 'OpenID Connect', value: 'OPENID_CONNECT' },
			{ name: 'AWS Lambda', value: 'AWS_LAMBDA' },
		],
		default: 'API_KEY',
		description: 'The authentication type',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['api'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'X-Ray Enabled',
				name: 'xrayEnabled',
				type: 'boolean',
				default: false,
				description: 'Whether to enable X-Ray tracing',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Tags as JSON object (e.g., {"Environment":"Production"})',
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
				resource: ['api'],
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

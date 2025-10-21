import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a GraphQL API',
				action: 'Create a GraphQL API',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/apis',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							name: '={{ $parameter["apiName"] }}',
							authenticationType: '={{ $parameter["authenticationType"] }}',
							userPoolConfig: '={{ $parameter["userPoolConfig"] }}',
							openIDConnectConfig: '={{ $parameter["openIDConnectConfig"] }}',
							tags: '={{ $parameter["tags"] }}',
							xrayEnabled: '={{ $parameter["xrayEnabled"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a GraphQL API',
				action: 'Delete a GraphQL API',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/v1/apis/{{ $parameter["apiId"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a GraphQL API',
				action: 'Get a GraphQL API',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apis/{{ $parameter["apiId"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List GraphQL APIs',
				action: 'List GraphQL APIs',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/apis?maxResults={{ $parameter["maxResults"] }}&nextToken={{ $parameter["nextToken"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Start Schema Creation',
				value: 'startSchemaCreation',
				description: 'Add a new schema to a GraphQL API',
				action: 'Start schema creation',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/apis/{{ $parameter["apiId"] }}/schemacreation',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							definition: '={{ $parameter["schemaDefinition"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a GraphQL API',
				action: 'Update a GraphQL API',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/apis/{{ $parameter["apiId"] }}',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							name: '={{ $parameter["apiName"] }}',
							authenticationType: '={{ $parameter["authenticationType"] }}',
							xrayEnabled: '={{ $parameter["xrayEnabled"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},
	// Common field
	{
		displayName: 'API ID',
		name: 'apiId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['delete', 'get', 'update', 'startSchemaCreation'],
			},
		},
		default: '',
		description: 'GraphQL API ID',
	},
	// Create/Update operations
	{
		displayName: 'API Name',
		name: 'apiName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Name of the GraphQL API',
	},
	{
		displayName: 'Authentication Type',
		name: 'authenticationType',
		type: 'options',
		options: [
			{ name: 'API Key', value: 'API_KEY' },
			{ name: 'AWS IAM', value: 'AWS_IAM' },
			{ name: 'Amazon Cognito User Pools', value: 'AMAZON_COGNITO_USER_POOLS' },
			{ name: 'OpenID Connect', value: 'OPENID_CONNECT' },
			{ name: 'AWS Lambda', value: 'AWS_LAMBDA' },
		],
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['create', 'update'],
			},
		},
		default: 'API_KEY',
		description: 'Security configuration for the API',
	},
	{
		displayName: 'User Pool Config',
		name: 'userPoolConfig',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['create'],
				authenticationType: ['AMAZON_COGNITO_USER_POOLS'],
			},
		},
		default: '{"userPoolId": "us-east-1_xxxxx", "awsRegion": "us-east-1", "defaultAction": "ALLOW"}',
		description: 'Cognito User Pool configuration',
	},
	{
		displayName: 'OpenID Connect Config',
		name: 'openIDConnectConfig',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['create'],
				authenticationType: ['OPENID_CONNECT'],
			},
		},
		default: '{"issuer": "https://example.com", "clientId": "client-id"}',
		description: 'OpenID Connect configuration',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Tags as key-value pairs',
	},
	{
		displayName: 'X-Ray Enabled',
		name: 'xrayEnabled',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['create', 'update'],
			},
		},
		default: false,
		description: 'Whether to enable AWS X-Ray tracing',
	},
	// List operation
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['list'],
			},
		},
		default: 25,
		description: 'Maximum number of APIs to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
	// Start Schema Creation
	{
		displayName: 'Schema Definition',
		name: 'schemaDefinition',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['graphqlApi'],
				operation: ['startSchemaCreation'],
			},
		},
		default: 'type Query { hello: String }',
		description: 'GraphQL schema definition (base64 encoded)',
	},
];

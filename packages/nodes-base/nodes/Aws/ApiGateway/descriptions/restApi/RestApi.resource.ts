import type { INodeProperties } from 'n8n-workflow';

export const restApiOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['restApi'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new REST API',
				action: 'Create a REST API',
				routing: {
					request: {
						method: 'POST',
						url: '/restapis',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a REST API',
				action: 'Delete a REST API',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/restapis/{{$parameter["restApiId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a REST API',
				action: 'Get a REST API',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{$parameter["restApiId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all REST APIs',
				action: 'List REST APIs',
				routing: {
					request: {
						method: 'GET',
						url: '/restapis',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a REST API',
				action: 'Update a REST API',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/restapis/{{$parameter["restApiId"]}}',
					},
				},
			},
		],
		default: 'list',
	},
];

export const restApiFields: INodeProperties[] = [
	{
		displayName: 'REST API ID',
		name: 'restApiId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['get', 'delete', 'update'],
			},
		},
		default: '',
		description: 'The ID of the REST API',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the REST API (1-128 characters)',
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
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
				resource: ['restApi'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'API description (max 1024 characters)',
				routing: {
					request: {
						body: {
							description: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Endpoint Type',
				name: 'endpointType',
				type: 'options',
				options: [
					{ name: 'Regional', value: 'REGIONAL' },
					{ name: 'Edge', value: 'EDGE' },
					{ name: 'Private', value: 'PRIVATE' },
				],
				default: 'REGIONAL',
				description: 'API endpoint type',
				routing: {
					request: {
						body: {
							endpointConfiguration: {
								types: '={{ [$value] }}',
							},
						},
					},
				},
			},
			{
				displayName: 'Minimum Compression Size',
				name: 'minimumCompressionSize',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 10485760,
				},
				default: -1,
				description: 'Compression threshold in bytes (-1 to disable)',
				routing: {
					request: {
						body: {
							minimumCompressionSize: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'API Key Source',
				name: 'apiKeySource',
				type: 'options',
				options: [
					{ name: 'Header', value: 'HEADER' },
					{ name: 'Authorizer', value: 'AUTHORIZER' },
				],
				default: 'HEADER',
				description: 'Source of API key for requests',
				routing: {
					request: {
						body: {
							apiKeySource: '={{ $value }}',
						},
					},
				},
			},
		],
	},
	{
		displayName: 'Patch Operations',
		name: 'patchOperations',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['update'],
			},
		},
		default: '[{"op":"replace","path":"/name","value":"NewName"}]',
		description: 'Array of patch operations to perform',
		routing: {
			request: {
				body: {
					patchOperations: '={{ JSON.parse($value) }}',
				},
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
				resource: ['restApi'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 25,
				description: 'Maximum number of APIs to return',
				routing: {
					request: {
						qs: {
							limit: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'string',
				default: '',
				description: 'Pagination token from previous response',
				routing: {
					request: {
						qs: {
							position: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];

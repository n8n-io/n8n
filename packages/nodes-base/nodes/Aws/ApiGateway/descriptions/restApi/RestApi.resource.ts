import type { INodeProperties } from 'n8n-workflow';
import { CURRENT_VERSION } from '../../helpers/constants';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
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
						body: {
							name: '={{ $parameter["apiName"] }}',
							description: '={{ $parameter["description"] }}',
							endpointConfiguration: '={{ $parameter["endpointConfiguration"] }}',
							apiKeySource: '={{ $parameter["apiKeySource"] }}',
							minimumCompressionSize: '={{ $parameter["minimumCompressionSize"] }}',
							tags: '={{ $parameter["tags"] }}',
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
				description: 'Delete a REST API',
				action: 'Delete a REST API',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/restapis/{{ $parameter["restApiId"] }}',
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
				description: 'Get a REST API',
				action: 'Get a REST API',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{ $parameter["restApiId"] }}',
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
				description: 'List all REST APIs',
				action: 'List REST APIs',
				routing: {
					request: {
						method: 'GET',
						url: '/restapis',
						qs: {
							limit: '={{ $parameter["limit"] }}',
							position: '={{ $parameter["position"] }}',
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
				description: 'Update a REST API',
				action: 'Update a REST API',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/restapis/{{ $parameter["restApiId"] }}',
						body: {
							patchOperations: '={{ $parameter["patchOperations"] }}',
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
	// Create operation fields
	{
		displayName: 'API Name',
		name: 'apiName',
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
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'A description of the REST API (max 1024 characters)',
	},
	{
		displayName: 'Endpoint Configuration',
		name: 'endpointConfiguration',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['create'],
			},
		},
		default: '{"types": ["REGIONAL"]}',
		description: 'Endpoint configuration: REGIONAL, EDGE, or PRIVATE',
	},
	{
		displayName: 'API Key Source',
		name: 'apiKeySource',
		type: 'options',
		options: [
			{
				name: 'HEADER',
				value: 'HEADER',
			},
			{
				name: 'AUTHORIZER',
				value: 'AUTHORIZER',
			},
		],
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['create'],
			},
		},
		default: 'HEADER',
		description: 'Source of the API key for requests',
	},
	{
		displayName: 'Minimum Compression Size',
		name: 'minimumCompressionSize',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['create'],
			},
		},
		default: 0,
		description: 'Minimum response size to compress (0-10485760 bytes)',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Key-value pairs for tagging',
	},
	// Get/Delete/Update operation fields
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
		description: 'The identifier of the REST API',
	},
	// Update operation fields
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
		default: '[]',
		description: 'Array of patch operations to apply',
	},
	// List operation fields
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['list'],
			},
		},
		default: 25,
		description: 'Maximum number of results to return (1-500)',
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['restApi'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];

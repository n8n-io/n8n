import type { INodeProperties } from 'n8n-workflow';
import { handleAmplifyError } from '../../helpers/errorHandler';

export const appOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['app'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Amplify app',
				action: 'Create an app',
				routing: {
					request: {
						method: 'POST',
						url: '/apps',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an Amplify app',
				action: 'Delete an app',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/apps/{{$parameter["appId"]}}',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of an Amplify app',
				action: 'Get an app',
				routing: {
					request: {
						method: 'GET',
						url: '=/apps/{{$parameter["appId"]}}',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all Amplify apps',
				action: 'List apps',
				routing: {
					request: {
						method: 'GET',
						url: '/apps',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'apps',
								},
							},
							handleAmplifyError,
						],
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an Amplify app',
				action: 'Update an app',
				routing: {
					request: {
						method: 'POST',
						url: '=/apps/{{$parameter["appId"]}}',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
		],
	},
];

export const appFields: INodeProperties[] = [
	// Common fields
	{
		displayName: 'App ID',
		name: 'appId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['delete', 'get', 'update'],
			},
		},
		description: 'The unique ID for an Amplify app',
	},

	// Create fields
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create'],
			},
		},
		description: 'The name for an Amplify app',
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Repository',
		name: 'repository',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create'],
			},
		},
		description: 'The repository for an Amplify app (e.g., GitHub URL)',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const repository = this.getNodeParameter('repository', 0) as string;
						if (repository) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).repository = repository;
						}
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Platform',
		name: 'platform',
		type: 'options',
		default: 'WEB',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Web',
				value: 'WEB',
			},
			{
				name: 'Web Compute',
				value: 'WEB_COMPUTE',
			},
			{
				name: 'Web Dynamic',
				value: 'WEB_DYNAMIC',
			},
		],
		description: 'The platform for the Amplify app',
		routing: {
			request: {
				body: {
					platform: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create', 'update'],
			},
		},
		description: 'The description for an Amplify app',
		routing: {
			request: {
				body: {
					description: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Environment Variables',
		name: 'environmentVariables',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create', 'update'],
			},
		},
		description: 'The environment variables for the Amplify app',
		routing: {
			request: {
				body: {
					environmentVariables: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Build Spec',
		name: 'buildSpec',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['create', 'update'],
			},
		},
		description: 'The build specification (build spec) for an Amplify app',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const buildSpec = this.getNodeParameter('buildSpec', 0) as string;
						if (buildSpec) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).buildSpec = buildSpec;
						}
						return requestOptions;
					},
				],
			},
		},
	},

	// List fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 25,
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['list'],
			},
		},
		description: 'Max number of results to return',
		routing: {
			request: {
				qs: {
					maxResults: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['app'],
				operation: ['list'],
			},
		},
		description: 'A pagination token for the next page',
		routing: {
			request: {
				qs: {
					nextToken: '={{ $value }}',
				},
			},
		},
	},
];

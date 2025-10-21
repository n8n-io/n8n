import type { INodeProperties } from 'n8n-workflow';
import { handleAmplifyError } from '../../helpers/errorHandler';

export const branchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['branch'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new branch for an Amplify app',
				action: 'Create a branch',
				routing: {
					request: {
						method: 'POST',
						url: '=/apps/{{$parameter["appId"]}}/branches',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a branch for an Amplify app',
				action: 'Delete a branch',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/apps/{{$parameter["appId"]}}/branches/{{$parameter["branchName"]}}',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a branch',
				action: 'Get a branch',
				routing: {
					request: {
						method: 'GET',
						url: '=/apps/{{$parameter["appId"]}}/branches/{{$parameter["branchName"]}}',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all branches for an Amplify app',
				action: 'List branches',
				routing: {
					request: {
						method: 'GET',
						url: '=/apps/{{$parameter["appId"]}}/branches',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'branches',
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
				description: 'Update a branch for an Amplify app',
				action: 'Update a branch',
				routing: {
					request: {
						method: 'POST',
						url: '=/apps/{{$parameter["appId"]}}/branches/{{$parameter["branchName"]}}',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
		],
	},
];

export const branchFields: INodeProperties[] = [
	// Common fields
	{
		displayName: 'App ID',
		name: 'appId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['branch'],
			},
		},
		description: 'The unique ID for an Amplify app',
	},
	{
		displayName: 'Branch Name',
		name: 'branchName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['branch'],
				operation: ['delete', 'get', 'update'],
			},
		},
		description: 'The name for the branch',
	},

	// Create fields
	{
		displayName: 'Branch Name',
		name: 'branchName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['branch'],
				operation: ['create'],
			},
		},
		description: 'The name for the branch',
		routing: {
			request: {
				body: {
					branchName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Framework',
		name: 'framework',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['branch'],
				operation: ['create', 'update'],
			},
		},
		description: 'The framework for the branch (e.g., React, Angular, Vue)',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const framework = this.getNodeParameter('framework', 0) as string;
						if (framework) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).framework = framework;
						}
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Stage',
		name: 'stage',
		type: 'options',
		default: 'NONE',
		displayOptions: {
			show: {
				resource: ['branch'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				name: 'Production',
				value: 'PRODUCTION',
			},
			{
				name: 'Beta',
				value: 'BETA',
			},
			{
				name: 'Development',
				value: 'DEVELOPMENT',
			},
			{
				name: 'Experimental',
				value: 'EXPERIMENTAL',
			},
			{
				name: 'Pull Request',
				value: 'PULL_REQUEST',
			},
			{
				name: 'None',
				value: 'NONE',
			},
		],
		description: 'The deployment stage for the branch',
		routing: {
			request: {
				body: {
					stage: '={{ $value }}',
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
				resource: ['branch'],
				operation: ['create', 'update'],
			},
		},
		description: 'The description for the branch',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const description = this.getNodeParameter('description', 0) as string;
						if (description) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).description = description;
						}
						return requestOptions;
					},
				],
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
				resource: ['branch'],
				operation: ['create', 'update'],
			},
		},
		description: 'The environment variables for the branch',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const envVars = this.getNodeParameter('environmentVariables', 0) as string;
						if (envVars && envVars !== '{}') {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).environmentVariables = JSON.parse(envVars);
						}
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Enable Auto Build',
		name: 'enableAutoBuild',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['branch'],
				operation: ['create', 'update'],
			},
		},
		description: 'Whether to enable auto build for the branch',
		routing: {
			request: {
				body: {
					enableAutoBuild: '={{ $value }}',
				},
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
				resource: ['branch'],
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
				resource: ['branch'],
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

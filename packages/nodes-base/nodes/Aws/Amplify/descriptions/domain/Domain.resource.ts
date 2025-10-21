import type { INodeProperties } from 'n8n-workflow';
import { handleAmplifyError } from '../../helpers/errorHandler';

export const domainOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['domain'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new custom domain for an Amplify app',
				action: 'Create a domain',
				routing: {
					request: {
						method: 'POST',
						url: '=/apps/{{$parameter["appId"]}}/domains',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a custom domain from an Amplify app',
				action: 'Delete a domain',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/apps/{{$parameter["appId"]}}/domains/{{$parameter["domainName"]}}',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a custom domain',
				action: 'Get a domain',
				routing: {
					request: {
						method: 'GET',
						url: '=/apps/{{$parameter["appId"]}}/domains/{{$parameter["domainName"]}}',
					},
					output: {
						postReceive: [handleAmplifyError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all custom domains for an Amplify app',
				action: 'List domains',
				routing: {
					request: {
						method: 'GET',
						url: '=/apps/{{$parameter["appId"]}}/domains',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'domainAssociations',
								},
							},
							handleAmplifyError,
						],
					},
				},
			},
		],
	},
];

export const domainFields: INodeProperties[] = [
	// Common fields
	{
		displayName: 'App ID',
		name: 'appId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['domain'],
			},
		},
		description: 'The unique ID for an Amplify app',
	},
	{
		displayName: 'Domain Name',
		name: 'domainName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['domain'],
				operation: ['delete', 'get'],
			},
		},
		description: 'The domain name (e.g., example.com)',
	},

	// Create fields
	{
		displayName: 'Domain Name',
		name: 'domainName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['domain'],
				operation: ['create'],
			},
		},
		description: 'The domain name (e.g., example.com)',
		routing: {
			request: {
				body: {
					domainName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Sub Domain Settings',
		name: 'subDomainSettings',
		type: 'json',
		default: '[{"prefix":"","branchName":"main"}]',
		displayOptions: {
			show: {
				resource: ['domain'],
				operation: ['create'],
			},
		},
		description: 'The subdomain settings for the domain. Example: [{"prefix":"www","branchName":"main"}]',
		routing: {
			request: {
				body: {
					subDomainSettings: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Enable Auto Sub Domain',
		name: 'enableAutoSubDomain',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['domain'],
				operation: ['create'],
			},
		},
		description: 'Whether to enable auto subdomain creation',
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const enableAutoSubDomain = this.getNodeParameter(
							'enableAutoSubDomain',
							0,
						) as boolean;
						if (enableAutoSubDomain) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as any).enableAutoSubDomain = enableAutoSubDomain;
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
				resource: ['domain'],
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
				resource: ['domain'],
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

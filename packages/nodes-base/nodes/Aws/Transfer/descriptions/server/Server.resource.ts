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
				resource: ['server'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a server',
				action: 'Create a server',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.CreateServer',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Protocols: '={{ $parameter["protocols"] }}',
							IdentityProviderType: '={{ $parameter["identityProviderType"] }}',
							EndpointType: '={{ $parameter["endpointType"] }}',
							LoggingRole: '={{ $parameter["loggingRole"] }}',
							Tags: '={{ $parameter["tags"] }}',
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
				description: 'Delete a server',
				action: 'Delete a server',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.DeleteServer',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Describe a server',
				action: 'Describe a server',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.DescribeServer',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
						},
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
				description: 'List servers',
				action: 'List servers',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.ListServers',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							MaxResults: '={{ $parameter["maxResults"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a server',
				action: 'Start a server',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.StartServer',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop a server',
				action: 'Stop a server',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.StopServer',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
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
				description: 'Update a server',
				action: 'Update a server',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.UpdateServer',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
							Protocols: '={{ $parameter["protocols"] }}',
							LoggingRole: '={{ $parameter["loggingRole"] }}',
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
		displayName: 'Server ID',
		name: 'serverId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['delete', 'describe', 'start', 'stop', 'update'],
			},
		},
		default: '',
		description: 'Transfer server ID',
	},
	// Create operation
	{
		displayName: 'Protocols',
		name: 'protocols',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['create', 'update'],
			},
		},
		default: '["SFTP"]',
		description: 'Array of protocols (SFTP, FTPS, FTP)',
	},
	{
		displayName: 'Identity Provider Type',
		name: 'identityProviderType',
		type: 'options',
		options: [
			{ name: 'Service Managed', value: 'SERVICE_MANAGED' },
			{ name: 'API Gateway', value: 'API_GATEWAY' },
			{ name: 'AWS Directory Service', value: 'AWS_DIRECTORY_SERVICE' },
			{ name: 'AWS Lambda', value: 'AWS_LAMBDA' },
		],
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['create'],
			},
		},
		default: 'SERVICE_MANAGED',
		description: 'Identity provider type for authentication',
	},
	{
		displayName: 'Endpoint Type',
		name: 'endpointType',
		type: 'options',
		options: [
			{ name: 'Public', value: 'PUBLIC' },
			{ name: 'VPC', value: 'VPC' },
			{ name: 'VPC Endpoint', value: 'VPC_ENDPOINT' },
		],
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['create'],
			},
		},
		default: 'PUBLIC',
		description: 'Server endpoint type',
	},
	{
		displayName: 'Logging Role',
		name: 'loggingRole',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'IAM role ARN for CloudWatch logging',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Tags as array of {Key, Value} objects',
	},
	// List operation
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of servers to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
];

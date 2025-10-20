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
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a user',
				action: 'Create a user',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.CreateUser',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
							UserName: '={{ $parameter["userName"] }}',
							Role: '={{ $parameter["role"] }}',
							HomeDirectory: '={{ $parameter["homeDirectory"] }}',
							SshPublicKeyBody: '={{ $parameter["sshPublicKey"] }}',
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
				description: 'Delete a user',
				action: 'Delete a user',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.DeleteUser',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
							UserName: '={{ $parameter["userName"] }}',
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
				description: 'Describe a user',
				action: 'Describe a user',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.DescribeUser',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
							UserName: '={{ $parameter["userName"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Import SSH Public Key',
				value: 'importSshPublicKey',
				description: 'Add SSH public key to user',
				action: 'Import SSH public key',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.ImportSshPublicKey',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
							UserName: '={{ $parameter["userName"] }}',
							SshPublicKeyBody: '={{ $parameter["sshPublicKey"] }}',
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
				description: 'List users',
				action: 'List users',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.ListUsers',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
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
				name: 'Update',
				value: 'update',
				description: 'Update a user',
				action: 'Update a user',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TransferService.UpdateUser',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ServerId: '={{ $parameter["serverId"] }}',
							UserName: '={{ $parameter["userName"] }}',
							Role: '={{ $parameter["role"] }}',
							HomeDirectory: '={{ $parameter["homeDirectory"] }}',
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
	// Common fields
	{
		displayName: 'Server ID',
		name: 'serverId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		default: '',
		description: 'Transfer server ID',
	},
	{
		displayName: 'User Name',
		name: 'userName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'delete', 'describe', 'update', 'importSshPublicKey'],
			},
		},
		default: '',
		description: 'Name of the user',
	},
	// Create/Update operations
	{
		displayName: 'Role',
		name: 'role',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'IAM role ARN for user access to S3',
	},
	{
		displayName: 'Home Directory',
		name: 'homeDirectory',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Landing directory (e.g., /bucket-name/path/)',
	},
	{
		displayName: 'SSH Public Key',
		name: 'sshPublicKey',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create', 'importSshPublicKey'],
			},
		},
		default: '',
		description: 'SSH public key body',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of users to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
];

import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an AWS account',
				action: 'Create an account',
				routing: { request: { method: 'POST', headers: { 'X-Amz-Target': 'AWSOrganizationsV20161128.CreateAccount' } } },
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get account details',
				action: 'Get an account',
				routing: { request: { method: 'POST', headers: { 'X-Amz-Target': 'AWSOrganizationsV20161128.DescribeAccount' } } },
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List accounts',
				action: 'Get many accounts',
				routing: { request: { method: 'POST', headers: { 'X-Amz-Target': 'AWSOrganizationsV20161128.ListAccounts' } } },
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove account from organization',
				action: 'Remove an account',
				routing: { request: { method: 'POST', headers: { 'X-Amz-Target': 'AWSOrganizationsV20161128.RemoveAccountFromOrganization' } } },
			},
		],
		default: 'create',
	},
];

export const accountFields: INodeProperties[] = [
	{
		displayName: 'Account Name',
		name: 'AccountName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['account'], operation: ['create'] } },
		default: '',
		routing: { request: { body: { AccountName: '={{ $value }}' } } },
		description: 'The friendly name of the account',
	},
	{
		displayName: 'Email',
		name: 'Email',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['account'], operation: ['create'] } },
		default: '',
		routing: { request: { body: { Email: '={{ $value }}' } } },
		description: 'The email address for the account owner',
	},
	{
		displayName: 'Account ID',
		name: 'AccountId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['account'], operation: ['get', 'remove'] } },
		default: '',
		routing: { request: { body: { AccountId: '={{ $value }}' } } },
		description: 'The unique identifier of the account',
	},
];

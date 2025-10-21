import type { INodeProperties } from 'n8n-workflow';

export const logGroupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['logGroup'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new log group',
				action: 'Create a log group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Logs_20140328.CreateLogGroup',
						},
						body: {
							logGroupName: '={{ $parameter["logGroupName"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a log group',
				action: 'Delete a log group',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Logs_20140328.DeleteLogGroup',
						},
						body: {
							logGroupName: '={{ $parameter["logGroupName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about log groups',
				action: 'Describe log groups',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Logs_20140328.DescribeLogGroups',
						},
						body: {},
					},
				},
			},
		],
		default: 'describe',
	},
];

export const logGroupFields: INodeProperties[] = [
	{
		displayName: 'Log Group Name',
		name: 'logGroupName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['logGroup'],
				operation: ['create', 'delete'],
			},
		},
		default: '',
		description: 'The name of the log group',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['logGroup'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Log Group Name Prefix',
				name: 'logGroupNamePrefix',
				type: 'string',
				default: '',
				description: 'Filter by log group name prefix',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Maximum number of log groups to return',
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

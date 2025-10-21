import type { INodeProperties } from 'n8n-workflow';

export const keyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['key'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a KMS key',
				action: 'Create a key',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.CreateKey',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a key',
				action: 'Describe a key',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.DescribeKey',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							KeyId: '={{ $parameter["keyId"] }}',
						},
					},
				},
			},
			{
				name: 'Disable',
				value: 'disable',
				description: 'Disable a key',
				action: 'Disable a key',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.DisableKey',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							KeyId: '={{ $parameter["keyId"] }}',
						},
					},
				},
			},
			{
				name: 'Enable',
				value: 'enable',
				description: 'Enable a key',
				action: 'Enable a key',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.EnableKey',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							KeyId: '={{ $parameter["keyId"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all keys',
				action: 'List keys',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.ListKeys',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					},
				},
			},
			{
				name: 'Schedule Deletion',
				value: 'scheduleDelete',
				description: 'Schedule key deletion',
				action: 'Schedule key deletion',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.ScheduleKeyDeletion',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							KeyId: '={{ $parameter["keyId"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const keyFields: INodeProperties[] = [
	{
		displayName: 'Key ID',
		name: 'keyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['describe', 'disable', 'enable', 'scheduleDelete'],
			},
		},
		default: '',
		description: 'The ID or ARN of the KMS key',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'Description of the key',
			},
			{
				displayName: 'Key Usage',
				name: 'KeyUsage',
				type: 'options',
				options: [
					{ name: 'Encrypt Decrypt', value: 'ENCRYPT_DECRYPT' },
					{ name: 'Sign Verify', value: 'SIGN_VERIFY' },
				],
				default: 'ENCRYPT_DECRYPT',
				description: 'Intended use of the key',
			},
			{
				displayName: 'Multi Region',
				name: 'MultiRegion',
				type: 'boolean',
				default: false,
				description: 'Whether to create a multi-region key',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['scheduleDelete'],
			},
		},
		options: [
			{
				displayName: 'Pending Window In Days',
				name: 'PendingWindowInDays',
				type: 'number',
				default: 30,
				description: 'Number of days before the key is deleted (7-30)',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['key'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'Limit',
				type: 'number',
				default: 100,
				description: 'Maximum number of keys to return',
			},
			{
				displayName: 'Marker',
				name: 'Marker',
				type: 'string',
				default: '',
				description: 'Marker for pagination',
			},
		],
	},
];

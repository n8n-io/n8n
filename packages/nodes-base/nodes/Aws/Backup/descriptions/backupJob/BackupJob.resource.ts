import type { INodeProperties } from 'n8n-workflow';

export const backupJobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['backupJob'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a backup job',
				action: 'Describe a backup job',
				routing: {
					request: {
						method: 'GET',
						url: '=/backup-jobs/{{ $parameter["backupJobId"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all backup jobs',
				action: 'List backup jobs',
				routing: {
					request: {
						method: 'GET',
						url: '/backup-jobs',
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop a running backup job',
				action: 'Stop a backup job',
				routing: {
					request: {
						method: 'POST',
						url: '=/backup-jobs/{{ $parameter["backupJobId"] }}',
					},
				},
			},
		],
		default: 'list',
	},
];

export const backupJobFields: INodeProperties[] = [
	{
		displayName: 'Backup Job ID',
		name: 'backupJobId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['backupJob'],
				operation: ['describe', 'stop'],
			},
		},
		default: '',
		description: 'The ID of the backup job',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['backupJob'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'By Resource ARN',
				name: 'byResourceArn',
				type: 'string',
				default: '',
				description: 'Filter by resource ARN',
			},
			{
				displayName: 'By State',
				name: 'byState',
				type: 'options',
				options: [
					{ name: 'Created', value: 'CREATED' },
					{ name: 'Pending', value: 'PENDING' },
					{ name: 'Running', value: 'RUNNING' },
					{ name: 'Completed', value: 'COMPLETED' },
					{ name: 'Failed', value: 'FAILED' },
					{ name: 'Aborted', value: 'ABORTED' },
					{ name: 'Expired', value: 'EXPIRED' },
				],
				default: 'RUNNING',
				description: 'Filter by job state',
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 100,
				description: 'Maximum number of jobs to return',
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

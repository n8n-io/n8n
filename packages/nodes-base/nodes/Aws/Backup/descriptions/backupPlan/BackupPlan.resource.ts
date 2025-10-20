import type { INodeProperties } from 'n8n-workflow';

export const backupPlanOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['backupPlan'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a backup plan',
				action: 'Delete a backup plan',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/backup-plans/{{ $parameter["backupPlanId"] }}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a backup plan',
				action: 'Get a backup plan',
				routing: {
					request: {
						method: 'GET',
						url: '=/backup-plans/{{ $parameter["backupPlanId"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all backup plans',
				action: 'List backup plans',
				routing: {
					request: {
						method: 'GET',
						url: '/backup-plans',
					},
				},
			},
		],
		default: 'list',
	},
];

export const backupPlanFields: INodeProperties[] = [
	{
		displayName: 'Backup Plan ID',
		name: 'backupPlanId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['backupPlan'],
				operation: ['delete', 'get'],
			},
		},
		default: '',
		description: 'The ID of the backup plan',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['backupPlan'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 100,
				description: 'Maximum number of plans to return',
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

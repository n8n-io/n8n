import type { INodeProperties } from 'n8n-workflow';
import { handleDataSyncError } from '../../helpers/errorHandler';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a DataSync task',
				action: 'Create a task',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'FmrsService.CreateTask',
						},
					},
					output: {
						postReceive: [handleDataSyncError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a DataSync task',
				action: 'Delete a task',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'FmrsService.DeleteTask',
						},
					},
					output: {
						postReceive: [handleDataSyncError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a DataSync task',
				action: 'Describe a task',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'FmrsService.DescribeTask',
						},
					},
					output: {
						postReceive: [handleDataSyncError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all DataSync tasks',
				action: 'List tasks',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'FmrsService.ListTasks',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Tasks',
								},
							},
							handleDataSyncError,
						],
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a DataSync task execution',
				action: 'Start a task',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'FmrsService.StartTaskExecution',
						},
					},
					output: {
						postReceive: [handleDataSyncError],
					},
				},
			},
		],
	},
];

export const taskFields: INodeProperties[] = [
	{
		displayName: 'Task ARN',
		name: 'taskArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['delete', 'describe', 'start'],
			},
		},
		description: 'The Amazon Resource Name (ARN) of the task',
		routing: {
			request: {
				body: {
					TaskArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Source Location ARN',
		name: 'sourceLocationArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		description: 'The ARN of the source location',
		routing: {
			request: {
				body: {
					SourceLocationArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Destination Location ARN',
		name: 'destinationLocationArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		description: 'The ARN of the destination location',
		routing: {
			request: {
				body: {
					DestinationLocationArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 100,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['list'],
			},
		},
		description: 'Max number of results to return',
		routing: {
			request: {
				body: {
					MaxResults: '={{ $value }}',
				},
			},
		},
	},
];

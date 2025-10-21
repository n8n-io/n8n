import type { INodeProperties } from 'n8n-workflow';
import { handleDeviceFarmError } from '../../helpers/errorHandler';

export const runOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['run'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a test run',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.GetRun',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'run',
								},
							},
							handleDeviceFarmError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List test runs',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.ListRuns',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'runs',
								},
							},
							handleDeviceFarmError,
						],
					},
				},
			},
			{
				name: 'Schedule',
				value: 'schedule',
				action: 'Schedule a test run',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.ScheduleRun',
						},
					},
					output: {
						postReceive: [handleDeviceFarmError],
					},
				},
			},
		],
	},
];

export const runFields: INodeProperties[] = [
	{
		displayName: 'Run ARN',
		name: 'arn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['get'],
			},
		},
		routing: {
			request: {
				body: {
					arn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Project ARN',
		name: 'projectArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['list', 'schedule'],
			},
		},
		routing: {
			request: {
				body: {
					projectArn: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Test',
		name: 'test',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['run'],
				operation: ['schedule'],
			},
		},
		routing: {
			request: {
				body: {
					test: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];

import type { INodeProperties } from 'n8n-workflow';
import { handleDeviceFarmError } from '../../helpers/errorHandler';

export const devicePoolOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['devicePool'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a device pool',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.CreateDevicePool',
						},
					},
					output: {
						postReceive: [handleDeviceFarmError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a device pool',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.GetDevicePool',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'devicePool',
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
				action: 'List device pools',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.ListDevicePools',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'devicePools',
								},
							},
							handleDeviceFarmError,
						],
					},
				},
			},
		],
	},
];

export const devicePoolFields: INodeProperties[] = [
	{
		displayName: 'Project ARN',
		name: 'projectArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['devicePool'],
				operation: ['create', 'list'],
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
		displayName: 'Device Pool ARN',
		name: 'arn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['devicePool'],
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
		displayName: 'Pool Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['devicePool'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Rules',
		name: 'rules',
		type: 'json',
		required: true,
		default: '[]',
		displayOptions: {
			show: {
				resource: ['devicePool'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					rules: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];

import type { INodeProperties } from 'n8n-workflow';
import { handleDeviceFarmError } from '../../helpers/errorHandler';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a project',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.CreateProject',
						},
					},
					output: {
						postReceive: [handleDeviceFarmError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a project',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.DeleteProject',
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
				action: 'Get a project',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.GetProject',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'project',
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
				action: 'List projects',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'DeviceFarm_20150623.ListProjects',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'projects',
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

export const projectFields: INodeProperties[] = [
	{
		displayName: 'Project Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
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
		displayName: 'Project ARN',
		name: 'arn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['delete', 'get'],
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
];

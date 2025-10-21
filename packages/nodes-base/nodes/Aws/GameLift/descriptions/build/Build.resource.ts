import type { INodeProperties } from 'n8n-workflow';
import { handleGameLiftError } from '../../helpers/errorHandler';

export const buildOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['build'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a build',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.CreateBuild',
						},
					},
					output: {
						postReceive: [handleGameLiftError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a build',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.DeleteBuild',
						},
					},
					output: {
						postReceive: [handleGameLiftError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				action: 'Describe a build',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.DescribeBuild',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Build',
								},
							},
							handleGameLiftError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				action: 'List builds',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'GameLift.ListBuilds',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Builds',
								},
							},
							handleGameLiftError,
						],
					},
				},
			},
		],
	},
];

export const buildFields: INodeProperties[] = [
	{
		displayName: 'Build Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Build ID',
		name: 'buildId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['delete', 'describe'],
			},
		},
		routing: {
			request: {
				body: {
					BuildId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Storage Location',
		name: 'storageLocation',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['build'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					StorageLocation: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];

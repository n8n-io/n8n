import type { INodeProperties } from 'n8n-workflow';
import { handleMediaConvertError } from '../../helpers/errorHandler';

export const jobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['job'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new transcoding job',
				action: 'Create a job',
				routing: {
					request: {
						method: 'POST',
						url: '/2017-08-29/jobs',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Job',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a transcoding job',
				action: 'Cancel a job',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/2017-08-29/jobs/{{$parameter["jobId"]}}',
					},
					output: {
						postReceive: [handleMediaConvertError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details of a job',
				action: 'Get a job',
				routing: {
					request: {
						method: 'GET',
						url: '=/2017-08-29/jobs/{{$parameter["jobId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Job',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all jobs',
				action: 'List jobs',
				routing: {
					request: {
						method: 'GET',
						url: '/2017-08-29/jobs',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'Jobs',
								},
							},
							handleMediaConvertError,
						],
					},
				},
			},
		],
	},
];

export const jobFields: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['cancel', 'get'],
			},
		},
		description: 'The job ID',
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		description: 'IAM role ARN for MediaConvert',
		routing: {
			request: {
				body: {
					Role: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Settings',
		name: 'settings',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		description: 'Job settings (JSON format)',
		routing: {
			request: {
				body: {
					Settings: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Queue',
		name: 'queue',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		description: 'Queue ARN or name',
		routing: {
			request: {
				body: {
					Queue: '={{ $value }}',
				},
			},
		},
	},
];

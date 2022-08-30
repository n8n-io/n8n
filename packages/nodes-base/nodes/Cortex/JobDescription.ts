import { INodeProperties } from 'n8n-workflow';

export const jobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		description: 'Choose an operation',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get job details',
				action: 'Get a job',
			},
			{
				name: 'Report',
				value: 'report',
				description: 'Get job report',
				action: 'Get a job report',
			},
		],
		default: 'get',
	},
];

export const jobFields: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['get', 'report'],
			},
		},
		default: '',
		description: 'ID of the job',
	},
];

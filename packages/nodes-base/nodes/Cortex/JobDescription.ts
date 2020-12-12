import {
	INodeProperties,
} from 'n8n-workflow';

export const jobOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		description: 'Choose an operation',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'job',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get job details',
			},
			{
				name: 'Report',
				value: 'report',
				description: 'Get job report',
			},
		],
		default: 'get',
	},
] as INodeProperties[];

export const jobFields: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'job',
				],
				operation: [
					'get',
					'report',
				],
			},
		},
		default: '',
		description: 'ID of the job',
	},
];

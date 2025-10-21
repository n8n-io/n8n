import type { INodeProperties } from 'n8n-workflow';
import { handleMacieError } from '../../helpers/errorHandler';

export const classificationJobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['classificationJob'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a classification job',
				action: 'Create a classification job',
				routing: {
					request: {
						method: 'POST',
						url: '/jobs',
					},
					output: {
						postReceive: [handleMacieError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a classification job',
				action: 'Describe a classification job',
				routing: {
					request: {
						method: 'GET',
						url: '=/jobs/{{$parameter["jobId"]}}',
					},
					output: {
						postReceive: [handleMacieError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all classification jobs',
				action: 'List classification jobs',
				routing: {
					request: {
						method: 'POST',
						url: '/jobs/list',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
							handleMacieError,
						],
					},
				},
			},
		],
	},
];

export const classificationJobFields: INodeProperties[] = [
	{
		displayName: 'Finding IDs',
		name: 'findingIds',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['finding'],
				operation: ['get'],
			},
		},
		description: 'Comma-separated list of finding IDs',
		routing: {
			request: {
				body: {
					findingIds: '={{ $value.split(",").map(s => s.trim()) }}',
				},
			},
		},
	},
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['classificationJob'],
				operation: ['describe'],
			},
		},
		description: 'The unique identifier for the classification job',
	},
	{
		displayName: 'Job Type',
		name: 'jobType',
		type: 'options',
		required: true,
		default: 'ONE_TIME',
		displayOptions: {
			show: {
				resource: ['classificationJob'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'One Time',
				value: 'ONE_TIME',
			},
			{
				name: 'Scheduled',
				value: 'SCHEDULED',
			},
		],
		description: 'The schedule for running the classification job',
		routing: {
			request: {
				body: {
					jobType: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'S3 Job Definition',
		name: 's3JobDefinition',
		type: 'json',
		required: true,
		default: '{}',
		displayOptions: {
			show: {
				resource: ['classificationJob'],
				operation: ['create'],
			},
		},
		description: 'S3 buckets to analyze (JSON format)',
		routing: {
			request: {
				body: {
					s3JobDefinition: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['classificationJob'],
				operation: ['create'],
			},
		},
		description: 'Custom name for the classification job',
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['classificationJob'],
				operation: ['create'],
			},
		},
		description: 'Custom description for the classification job',
		routing: {
			request: {
				body: {
					description: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: ['classificationJob'],
				operation: ['list'],
			},
		},
		description: 'Max number of results to return',
		routing: {
			request: {
				body: {
					maxResults: '={{ $value }}',
				},
			},
		},
	},
];

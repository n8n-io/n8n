import type { INodeProperties } from 'n8n-workflow';

export const jobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['job'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a job',
				action: 'Get a job',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetJob',
						},
						body: {
							JobName: '={{ $parameter["jobName"] }}',
						},
					},
				},
			},
			{
				name: 'Get Run',
				value: 'getRun',
				description: 'Get details about a job run',
				action: 'Get a job run',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetJobRun',
						},
						body: {
							JobName: '={{ $parameter["jobName"] }}',
							RunId: '={{ $parameter["runId"] }}',
						},
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
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetJobs',
						},
					},
				},
			},
			{
				name: 'List Runs',
				value: 'listRuns',
				description: 'List job runs',
				action: 'List job runs',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetJobRuns',
						},
						body: {
							JobName: '={{ $parameter["jobName"] }}',
						},
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a job run',
				action: 'Start a job run',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.StartJobRun',
						},
						body: {
							JobName: '={{ $parameter["jobName"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const jobFields: INodeProperties[] = [
	{
		displayName: 'Job Name',
		name: 'jobName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['get', 'getRun', 'start', 'listRuns'],
			},
		},
		default: '',
		description: 'Name of the job',
	},
	{
		displayName: 'Run ID',
		name: 'runId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['getRun'],
			},
		},
		default: '',
		description: 'ID of the job run',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['start'],
			},
		},
		options: [
			{
				displayName: 'Arguments',
				name: 'Arguments',
				type: 'json',
				default: '{}',
				description: 'Job arguments as JSON',
				routing: {
					request: {
						body: {
							Arguments: '={{ JSON.parse($value) }}',
						},
					},
				},
			},
			{
				displayName: 'Timeout',
				name: 'Timeout',
				type: 'number',
				default: 2880,
				description: 'Job timeout in minutes',
				routing: {
					request: {
						body: {
							Timeout: '={{ $value }}',
						},
					},
				},
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['list', 'listRuns'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 100,
				description: 'Maximum number of results',
				routing: {
					request: {
						body: {
							MaxResults: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Pagination token',
				routing: {
					request: {
						body: {
							NextToken: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];

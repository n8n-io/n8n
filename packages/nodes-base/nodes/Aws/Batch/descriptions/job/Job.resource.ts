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
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a job',
				action: 'Cancel a job',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/canceljob',
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about jobs',
				action: 'Describe jobs',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/describejobs',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List jobs',
				action: 'List jobs',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/listjobs',
					},
				},
			},
			{
				name: 'Submit',
				value: 'submit',
				description: 'Submit a new job',
				action: 'Submit a job',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/submitjob',
					},
				},
			},
			{
				name: 'Terminate',
				value: 'terminate',
				description: 'Terminate a job',
				action: 'Terminate a job',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/terminatejob',
					},
				},
			},
		],
		default: 'list',
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
				operation: ['cancel', 'terminate'],
			},
		},
		default: '',
		description: 'The ID of the job',
		routing: {
			request: {
				body: {
					jobId: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['cancel', 'terminate'],
			},
		},
		default: '',
		description: 'Reason for canceling or terminating the job',
		routing: {
			request: {
				body: {
					reason: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Job Name',
		name: 'jobName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit'],
			},
		},
		default: '',
		description: 'Name of the job',
		routing: {
			request: {
				body: {
					jobName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Job Queue',
		name: 'jobQueue',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit', 'list'],
			},
		},
		default: '',
		description: 'Job queue name or ARN',
		routing: {
			request: {
				body: {
					jobQueue: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Job Definition',
		name: 'jobDefinition',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit'],
			},
		},
		default: '',
		description: 'Job definition name or ARN',
		routing: {
			request: {
				body: {
					jobDefinition: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Job IDs',
		name: 'jobs',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['describe'],
			},
		},
		default: '',
		description: 'Comma-separated list of job IDs',
		routing: {
			request: {
				body: {
					jobs: '={{ $value.split(",").map(v => v.trim()) }}',
				},
			},
		},
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
				operation: ['submit'],
			},
		},
		options: [
			{
				displayName: 'Container Overrides',
				name: 'containerOverrides',
				type: 'json',
				default: '{}',
				description: 'Container property overrides (JSON)',
				routing: {
					request: {
						body: {
							containerOverrides: '={{ JSON.parse($value) }}',
						},
					},
				},
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'json',
				default: '{}',
				description: 'Job parameters (JSON)',
				routing: {
					request: {
						body: {
							parameters: '={{ JSON.parse($value) }}',
						},
					},
				},
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 3600,
				description: 'Job timeout in seconds',
				routing: {
					request: {
						body: {
							timeout: {
								attemptDurationSeconds: '={{ $value }}',
							},
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
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Job Status',
				name: 'jobStatus',
				type: 'options',
				options: [
					{ name: 'Submitted', value: 'SUBMITTED' },
					{ name: 'Pending', value: 'PENDING' },
					{ name: 'Runnable', value: 'RUNNABLE' },
					{ name: 'Starting', value: 'STARTING' },
					{ name: 'Running', value: 'RUNNING' },
					{ name: 'Succeeded', value: 'SUCCEEDED' },
					{ name: 'Failed', value: 'FAILED' },
				],
				default: 'RUNNING',
				description: 'Filter by job status',
				routing: {
					request: {
						body: {
							jobStatus: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Maximum number of results',
				routing: {
					request: {
						body: {
							maxResults: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Next Token',
				name: 'nextToken',
				type: 'string',
				default: '',
				description: 'Pagination token',
				routing: {
					request: {
						body: {
							nextToken: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];

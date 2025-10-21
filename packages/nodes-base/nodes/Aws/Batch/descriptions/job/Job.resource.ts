import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
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
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a job',
				action: 'Cancel a job',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/canceljob',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							jobId: '={{ $parameter["jobId"] }}',
							reason: '={{ $parameter["reason"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Describe jobs',
				action: 'Describe jobs',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/describejobs',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							jobs: '={{ $parameter["jobIds"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
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
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							jobQueue: '={{ $parameter["jobQueue"] }}',
							jobStatus: '={{ $parameter["jobStatus"] }}',
							maxResults: '={{ $parameter["maxResults"] }}',
							nextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Submit',
				value: 'submit',
				description: 'Submit a job',
				action: 'Submit a job',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/submitjob',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							jobName: '={{ $parameter["jobName"] }}',
							jobQueue: '={{ $parameter["jobQueue"] }}',
							jobDefinition: '={{ $parameter["jobDefinition"] }}',
							parameters: '={{ $parameter["parameters"] }}',
							containerOverrides: '={{ $parameter["containerOverrides"] }}',
							dependsOn: '={{ $parameter["dependsOn"] }}',
							timeout: '={{ $parameter["timeout"] }}',
							tags: '={{ $parameter["tags"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
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
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							jobId: '={{ $parameter["jobId"] }}',
							reason: '={{ $parameter["reason"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},
	// Cancel/Terminate operations
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
		description: 'ID of the job',
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
		description: 'Reason for canceling/terminating the job',
	},
	// Describe operation
	{
		displayName: 'Job IDs',
		name: 'jobIds',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['describe'],
			},
		},
		default: '[]',
		description: 'Array of job IDs to describe (max 100)',
	},
	// List operation
	{
		displayName: 'Job Queue',
		name: 'jobQueue',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Job queue name or ARN to filter by',
	},
	{
		displayName: 'Job Status',
		name: 'jobStatus',
		type: 'options',
		options: [
			{ name: 'All', value: '' },
			{ name: 'Submitted', value: 'SUBMITTED' },
			{ name: 'Pending', value: 'PENDING' },
			{ name: 'Runnable', value: 'RUNNABLE' },
			{ name: 'Starting', value: 'STARTING' },
			{ name: 'Running', value: 'RUNNING' },
			{ name: 'Succeeded', value: 'SUCCEEDED' },
			{ name: 'Failed', value: 'FAILED' },
		],
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Filter by job status',
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of jobs to return',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
	// Submit operation
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
	},
	{
		displayName: 'Job Queue',
		name: 'jobQueue',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit'],
			},
		},
		default: '',
		description: 'Job queue name or ARN',
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
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit'],
			},
		},
		default: '{}',
		description: 'Job parameters as key-value pairs',
	},
	{
		displayName: 'Container Overrides',
		name: 'containerOverrides',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit'],
			},
		},
		default: '{}',
		description: 'Container property overrides (vcpus, memory, command, environment)',
	},
	{
		displayName: 'Depends On',
		name: 'dependsOn',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit'],
			},
		},
		default: '[]',
		description: 'Array of job dependencies (jobId and optionally type)',
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit'],
			},
		},
		default: '{"attemptDurationSeconds": 3600}',
		description: 'Job timeout configuration',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['submit'],
			},
		},
		default: '{}',
		description: 'Tags as key-value pairs',
	},
];

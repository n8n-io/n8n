import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: {
			show: {
				resource: ['job'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a Glue job',
				action: 'Create a Glue job',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.CreateJob',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Name: '={{ $parameter["jobName"] }}',
							Role: '={{ $parameter["role"] }}',
							Command: '={{ $parameter["command"] }}',
							DefaultArguments: '={{ $parameter["defaultArguments"] }}',
							MaxRetries: '={{ $parameter["maxRetries"] }}',
							Timeout: '={{ $parameter["timeout"] }}',
							GlueVersion: '={{ $parameter["glueVersion"] }}',
							NumberOfWorkers: '={{ $parameter["numberOfWorkers"] }}',
							WorkerType: '={{ $parameter["workerType"] }}',
							Tags: '={{ $parameter["tags"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Glue job',
				action: 'Delete a Glue job',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.DeleteJob',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							JobName: '={{ $parameter["jobName"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a Glue job',
				action: 'Get a Glue job',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetJob',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							JobName: '={{ $parameter["jobName"] }}',
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
				description: 'List Glue jobs',
				action: 'List Glue jobs',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetJobs',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							MaxResults: '={{ $parameter["maxResults"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Start Run',
				value: 'startRun',
				description: 'Start a job run',
				action: 'Start a job run',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.StartJobRun',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							JobName: '={{ $parameter["jobName"] }}',
							Arguments: '={{ $parameter["arguments"] }}',
							Timeout: '={{ $parameter["timeout"] }}',
							NumberOfWorkers: '={{ $parameter["numberOfWorkers"] }}',
							WorkerType: '={{ $parameter["workerType"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get Run',
				value: 'getRun',
				description: 'Get job run details',
				action: 'Get job run details',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetJobRun',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							JobName: '={{ $parameter["jobName"] }}',
							RunId: '={{ $parameter["runId"] }}',
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
	// Common field
	{
		displayName: 'Job Name',
		name: 'jobName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
			},
		},
		default: '',
		description: 'Name of the Glue job',
	},
	// Create operation fields
	{
		displayName: 'Role ARN',
		name: 'role',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'IAM role ARN for the job',
	},
	{
		displayName: 'Command',
		name: 'command',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		default: '{"Name": "glueetl", "ScriptLocation": "s3://bucket/path/script.py", "PythonVersion": "3"}',
		description: 'Job command configuration',
	},
	{
		displayName: 'Default Arguments',
		name: 'defaultArguments',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Default arguments for the job',
	},
	{
		displayName: 'Max Retries',
		name: 'maxRetries',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		default: 0,
		description: 'Maximum number of retries',
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create', 'startRun'],
			},
		},
		default: 2880,
		description: 'Job timeout in minutes',
	},
	{
		displayName: 'Glue Version',
		name: 'glueVersion',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		default: '4.0',
		description: 'Glue version (e.g., 4.0, 3.0, 2.0)',
	},
	{
		displayName: 'Number of Workers',
		name: 'numberOfWorkers',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create', 'startRun'],
			},
		},
		default: 2,
		description: 'Number of workers',
	},
	{
		displayName: 'Worker Type',
		name: 'workerType',
		type: 'options',
		options: [
			{ name: 'Standard', value: 'Standard' },
			{ name: 'G.1X', value: 'G.1X' },
			{ name: 'G.2X', value: 'G.2X' },
			{ name: 'G.025X', value: 'G.025X' },
			{ name: 'Z.2X', value: 'Z.2X' },
		],
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create', 'startRun'],
			},
		},
		default: 'Standard',
		description: 'Type of worker',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Key-value pairs for tagging',
	},
	// Start Run operation fields
	{
		displayName: 'Arguments',
		name: 'arguments',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['job'],
				operation: ['startRun'],
			},
		},
		default: '{}',
		description: 'Arguments for the job run',
	},
	// Get Run operation fields
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
	// List operation fields
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
		description: 'Maximum number of results to return',
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
		description: 'Pagination token from previous response',
	},
];

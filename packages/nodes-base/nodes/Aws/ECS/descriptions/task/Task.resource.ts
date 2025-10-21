import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'runTask',
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
		options: [
			{
				name: 'Run Task',
				value: 'runTask',
				description: 'Run a task',
				action: 'Run a task',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.RunTask',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
							taskDefinition: '={{ $parameter["taskDefinition"] }}',
							count: '={{ $parameter["count"] }}',
							launchType: '={{ $parameter["launchType"] }}',
							networkConfiguration: '={{ $parameter["networkConfiguration"] }}',
							overrides: '={{ $parameter["overrides"] }}',
							platformVersion: '={{ $parameter["platformVersion"] }}',
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
				name: 'Stop Task',
				value: 'stopTask',
				description: 'Stop a task',
				action: 'Stop a task',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.StopTask',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
							task: '={{ $parameter["task"] }}',
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
				name: 'Describe Tasks',
				value: 'describeTasks',
				description: 'Describe tasks',
				action: 'Describe tasks',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DescribeTasks',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
							tasks: '={{ $parameter["tasks"] }}',
							include: '={{ $parameter["include"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List Tasks',
				value: 'listTasks',
				description: 'List tasks',
				action: 'List tasks',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.ListTasks',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
							serviceName: '={{ $parameter["serviceName"] }}',
							desiredStatus: '={{ $parameter["desiredStatus"] }}',
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
		],
	},
	// Common fields
	{
		displayName: 'Cluster',
		name: 'cluster',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
		default: '',
		description: 'The cluster name or ARN',
	},
	// Run Task operation fields
	{
		displayName: 'Task Definition',
		name: 'taskDefinition',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['runTask'],
			},
		},
		default: '',
		description: 'The family and revision or full ARN of the task definition',
	},
	{
		displayName: 'Count',
		name: 'count',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['runTask'],
			},
		},
		default: 1,
		description: 'Number of instantiations of the task to run',
	},
	{
		displayName: 'Launch Type',
		name: 'launchType',
		type: 'options',
		options: [
			{ name: 'EC2', value: 'EC2' },
			{ name: 'FARGATE', value: 'FARGATE' },
			{ name: 'EXTERNAL', value: 'EXTERNAL' },
		],
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['runTask'],
			},
		},
		default: 'FARGATE',
		description: 'Infrastructure to run tasks on',
	},
	{
		displayName: 'Network Configuration',
		name: 'networkConfiguration',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['runTask'],
			},
		},
		default: '{}',
		description: 'Network configuration for tasks',
	},
	{
		displayName: 'Overrides',
		name: 'overrides',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['runTask'],
			},
		},
		default: '{}',
		description: 'Container overrides for the task',
	},
	{
		displayName: 'Platform Version',
		name: 'platformVersion',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['runTask'],
			},
		},
		default: '',
		description: 'Fargate platform version (e.g., LATEST, 1.4.0)',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['runTask'],
			},
		},
		default: '[]',
		description: 'Array of tag objects',
	},
	// Stop Task operation fields
	{
		displayName: 'Task',
		name: 'task',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['stopTask'],
			},
		},
		default: '',
		description: 'The task ID or full ARN of the task to stop',
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['stopTask'],
			},
		},
		default: '',
		description: 'Reason for stopping the task',
	},
	// Describe Tasks operation fields
	{
		displayName: 'Tasks',
		name: 'tasks',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['describeTasks'],
			},
		},
		default: '[]',
		description: 'Array of task IDs or ARNs',
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['describeTasks'],
			},
		},
		default: '[]',
		description: 'Additional information to include (TAGS)',
	},
	// List Tasks operation fields
	{
		displayName: 'Service Name',
		name: 'serviceName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['listTasks'],
			},
		},
		default: '',
		description: 'Name of the service to filter tasks',
	},
	{
		displayName: 'Desired Status',
		name: 'desiredStatus',
		type: 'options',
		options: [
			{ name: 'RUNNING', value: 'RUNNING' },
			{ name: 'PENDING', value: 'PENDING' },
			{ name: 'STOPPED', value: 'STOPPED' },
		],
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['listTasks'],
			},
		},
		default: '',
		description: 'Filter by desired task status',
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['listTasks'],
			},
		},
		default: 100,
		description: 'Maximum number of results to return (1-100)',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['listTasks'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];

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
				resource: ['activity'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an activity',
				action: 'Create an activity',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.CreateActivity',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							name: '={{ $parameter["activityName"] }}',
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete an activity',
				action: 'Delete an activity',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DeleteActivity',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							activityArn: '={{ $parameter["activityArn"] }}',
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
				description: 'Describe an activity',
				action: 'Describe an activity',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DescribeActivity',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							activityArn: '={{ $parameter["activityArn"] }}',
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
				description: 'List activities',
				action: 'List activities',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.ListActivities',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
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
				name: 'Get Task',
				value: 'getTask',
				description: 'Get an activity task',
				action: 'Get an activity task',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.GetActivityTask',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							activityArn: '={{ $parameter["activityArn"] }}',
							workerName: '={{ $parameter["workerName"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Send Task Success',
				value: 'sendTaskSuccess',
				description: 'Send task success',
				action: 'Send task success',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.SendTaskSuccess',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							taskToken: '={{ $parameter["taskToken"] }}',
							output: '={{ $parameter["output"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Send Task Failure',
				value: 'sendTaskFailure',
				description: 'Send task failure',
				action: 'Send task failure',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.SendTaskFailure',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							taskToken: '={{ $parameter["taskToken"] }}',
							error: '={{ $parameter["error"] }}',
							cause: '={{ $parameter["cause"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Send Task Heartbeat',
				value: 'sendTaskHeartbeat',
				description: 'Send task heartbeat',
				action: 'Send task heartbeat',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.SendTaskHeartbeat',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							taskToken: '={{ $parameter["taskToken"] }}',
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
	// Create operation fields
	{
		displayName: 'Activity Name',
		name: 'activityName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the activity (1-80 characters)',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of {key, value} tag objects',
	},
	// Delete/Describe/GetTask operation fields
	{
		displayName: 'Activity ARN',
		name: 'activityArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['delete', 'describe', 'getTask'],
			},
		},
		default: '',
		description: 'ARN of the activity',
	},
	// GetTask operation fields
	{
		displayName: 'Worker Name',
		name: 'workerName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getTask'],
			},
		},
		default: '',
		description: 'Worker identifier (max 256 characters)',
	},
	// Task operations - common field
	{
		displayName: 'Task Token',
		name: 'taskToken',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendTaskSuccess', 'sendTaskFailure', 'sendTaskHeartbeat'],
			},
		},
		default: '',
		description: 'Task token from GetActivityTask',
	},
	// SendTaskSuccess operation fields
	{
		displayName: 'Output',
		name: 'output',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendTaskSuccess'],
			},
		},
		default: '{}',
		description: 'JSON output (max 262144 bytes)',
	},
	// SendTaskFailure operation fields
	{
		displayName: 'Error',
		name: 'error',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendTaskFailure'],
			},
		},
		default: '',
		description: 'Error code (max 256 characters)',
	},
	{
		displayName: 'Cause',
		name: 'cause',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['sendTaskFailure'],
			},
		},
		default: '',
		description: 'Error cause description (max 32768 characters)',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of results to return (1-1000)',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];

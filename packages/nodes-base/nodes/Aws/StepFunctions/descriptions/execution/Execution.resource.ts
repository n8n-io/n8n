import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'start',
		displayOptions: {
			show: {
				resource: ['execution'],
			},
		},
		options: [
			{
				name: 'Start',
				value: 'start',
				description: 'Start an execution',
				action: 'Start an execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.StartExecution',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
							name: '={{ $parameter["executionName"] }}',
							input: '={{ $parameter["input"] }}',
							traceHeader: '={{ $parameter["traceHeader"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop an execution',
				action: 'Stop an execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.StopExecution',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							executionArn: '={{ $parameter["executionArn"] }}',
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
				name: 'Describe',
				value: 'describe',
				description: 'Describe an execution',
				action: 'Describe an execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DescribeExecution',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							executionArn: '={{ $parameter["executionArn"] }}',
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
				description: 'List executions',
				action: 'List executions',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.ListExecutions',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
							statusFilter: '={{ $parameter["statusFilter"] }}',
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
				name: 'Get History',
				value: 'getHistory',
				description: 'Get execution history',
				action: 'Get execution history',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.GetExecutionHistory',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							executionArn: '={{ $parameter["executionArn"] }}',
							maxResults: '={{ $parameter["maxResults"] }}',
							reverseOrder: '={{ $parameter["reverseOrder"] }}',
							nextToken: '={{ $parameter["nextToken"] }}',
							includeExecutionData: '={{ $parameter["includeExecutionData"] }}',
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
	// Start operation fields
	{
		displayName: 'State Machine ARN',
		name: 'stateMachineArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['start', 'list'],
			},
		},
		default: '',
		description: 'ARN of the state machine',
	},
	{
		displayName: 'Execution Name',
		name: 'executionName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['start'],
			},
		},
		default: '',
		description: 'Name of the execution (auto-generated if omitted)',
	},
	{
		displayName: 'Input',
		name: 'input',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['start'],
			},
		},
		default: '{}',
		description: 'JSON input to the execution (max 262144 bytes)',
	},
	{
		displayName: 'Trace Header',
		name: 'traceHeader',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['start'],
			},
		},
		default: '',
		description: 'X-Ray trace header',
	},
	// Stop/Describe/GetHistory operation fields
	{
		displayName: 'Execution ARN',
		name: 'executionArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['stop', 'describe', 'getHistory'],
			},
		},
		default: '',
		description: 'ARN of the execution',
	},
	// Stop operation fields
	{
		displayName: 'Error',
		name: 'error',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['stop'],
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
				resource: ['execution'],
				operation: ['stop'],
			},
		},
		default: '',
		description: 'Error cause description (max 32768 characters)',
	},
	// List operation fields
	{
		displayName: 'Status Filter',
		name: 'statusFilter',
		type: 'options',
		options: [
			{ name: 'RUNNING', value: 'RUNNING' },
			{ name: 'SUCCEEDED', value: 'SUCCEEDED' },
			{ name: 'FAILED', value: 'FAILED' },
			{ name: 'TIMED_OUT', value: 'TIMED_OUT' },
			{ name: 'ABORTED', value: 'ABORTED' },
		],
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Filter executions by status',
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['list', 'getHistory'],
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
				resource: ['execution'],
				operation: ['list', 'getHistory'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
	// GetHistory operation fields
	{
		displayName: 'Reverse Order',
		name: 'reverseOrder',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['getHistory'],
			},
		},
		default: false,
		description: 'Whether to list events in reverse chronological order',
	},
	{
		displayName: 'Include Execution Data',
		name: 'includeExecutionData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['getHistory'],
			},
		},
		default: true,
		description: 'Whether to include input/output data',
	},
];

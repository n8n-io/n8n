import type { INodeProperties } from 'n8n-workflow';

export const executionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['execution'],
			},
		},
		options: [
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about an execution',
				action: 'Describe an execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DescribeExecution',
						},
						body: {
							executionArn: '={{ $parameter["executionArn"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List executions for a state machine',
				action: 'List executions',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.ListExecutions',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
						},
					},
				},
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a new execution',
				action: 'Start an execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.StartExecution',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
						},
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop a running execution',
				action: 'Stop an execution',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.StopExecution',
						},
						body: {
							executionArn: '={{ $parameter["executionArn"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const executionFields: INodeProperties[] = [
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
		description: 'The ARN of the state machine',
	},
	{
		displayName: 'Execution ARN',
		name: 'executionArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['describe', 'stop'],
			},
		},
		default: '',
		description: 'The ARN of the execution',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['execution'],
				operation: ['start'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Execution name (auto-generated if omitted)',
				routing: {
					request: {
						body: {
							name: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Input',
				name: 'input',
				type: 'json',
				default: '{}',
				description: 'JSON input to the execution (max 262144 bytes)',
				routing: {
					request: {
						body: {
							input: '={{ $value }}',
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
				resource: ['execution'],
				operation: ['stop'],
			},
		},
		options: [
			{
				displayName: 'Error',
				name: 'error',
				type: 'string',
				default: '',
				description: 'Error code (max 256 characters)',
				routing: {
					request: {
						body: {
							error: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Cause',
				name: 'cause',
				type: 'string',
				default: '',
				description: 'Error cause description (max 32768 characters)',
				routing: {
					request: {
						body: {
							cause: '={{ $value }}',
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
				resource: ['execution'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Status Filter',
				name: 'statusFilter',
				type: 'options',
				options: [
					{ name: 'Running', value: 'RUNNING' },
					{ name: 'Succeeded', value: 'SUCCEEDED' },
					{ name: 'Failed', value: 'FAILED' },
					{ name: 'Timed Out', value: 'TIMED_OUT' },
					{ name: 'Aborted', value: 'ABORTED' },
				],
				default: 'RUNNING',
				description: 'Filter by execution status',
				routing: {
					request: {
						body: {
							statusFilter: '={{ $value }}',
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
					maxValue: 1000,
				},
				default: 100,
				description: 'Maximum number of results to return',
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
				description: 'Pagination token from previous response',
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

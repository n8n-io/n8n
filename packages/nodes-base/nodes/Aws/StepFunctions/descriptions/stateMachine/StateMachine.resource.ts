import type { INodeProperties } from 'n8n-workflow';

export const stateMachineOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['stateMachine'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new state machine',
				action: 'Create a state machine',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.CreateStateMachine',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a state machine',
				action: 'Delete a state machine',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DeleteStateMachine',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a state machine',
				action: 'Describe a state machine',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DescribeStateMachine',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all state machines',
				action: 'List state machines',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.ListStateMachines',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a state machine',
				action: 'Update a state machine',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.UpdateStateMachine',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const stateMachineFields: INodeProperties[] = [
	{
		displayName: 'State Machine ARN',
		name: 'stateMachineArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['describe', 'delete', 'update'],
			},
		},
		default: '',
		description: 'The ARN of the state machine',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the state machine (1-80 characters)',
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Definition',
		name: 'definition',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create'],
			},
		},
		default: '{"Comment":"A Hello World example","StartAt":"HelloWorld","States":{"HelloWorld":{"Type":"Pass","Result":"Hello World!","End":true}}}',
		description: 'Amazon States Language definition (JSON)',
		routing: {
			request: {
				body: {
					definition: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Role ARN',
		name: 'roleArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'IAM role ARN for state machine execution',
		routing: {
			request: {
				body: {
					roleArn: '={{ $value }}',
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
				resource: ['stateMachine'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Standard', value: 'STANDARD' },
					{ name: 'Express', value: 'EXPRESS' },
				],
				default: 'STANDARD',
				description: 'State machine type',
				routing: {
					request: {
						body: {
							type: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Logging Level',
				name: 'loggingLevel',
				type: 'options',
				options: [
					{ name: 'All', value: 'ALL' },
					{ name: 'Error', value: 'ERROR' },
					{ name: 'Fatal', value: 'FATAL' },
					{ name: 'Off', value: 'OFF' },
				],
				default: 'OFF',
				description: 'CloudWatch logging level',
				routing: {
					request: {
						body: {
							loggingConfiguration: {
								level: '={{ $value }}',
							},
						},
					},
				},
			},
			{
				displayName: 'Tracing Enabled',
				name: 'tracingEnabled',
				type: 'boolean',
				default: false,
				description: 'Whether to enable X-Ray tracing',
				routing: {
					request: {
						body: {
							tracingConfiguration: {
								enabled: '={{ $value }}',
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
				resource: ['stateMachine'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Definition',
				name: 'definition',
				type: 'json',
				default: '',
				description: 'New Amazon States Language definition',
				routing: {
					request: {
						body: {
							definition: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Role ARN',
				name: 'roleArn',
				type: 'string',
				default: '',
				description: 'New IAM role ARN',
				routing: {
					request: {
						body: {
							roleArn: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Logging Level',
				name: 'loggingLevel',
				type: 'options',
				options: [
					{ name: 'All', value: 'ALL' },
					{ name: 'Error', value: 'ERROR' },
					{ name: 'Fatal', value: 'FATAL' },
					{ name: 'Off', value: 'OFF' },
				],
				default: 'OFF',
				description: 'CloudWatch logging level',
				routing: {
					request: {
						body: {
							loggingConfiguration: {
								level: '={{ $value }}',
							},
						},
					},
				},
			},
			{
				displayName: 'Tracing Enabled',
				name: 'tracingEnabled',
				type: 'boolean',
				default: false,
				description: 'Whether to enable X-Ray tracing',
				routing: {
					request: {
						body: {
							tracingConfiguration: {
								enabled: '={{ $value }}',
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
				resource: ['stateMachine'],
				operation: ['list'],
			},
		},
		options: [
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

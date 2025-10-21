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
				resource: ['stateMachine'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a state machine',
				action: 'Create a state machine',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.CreateStateMachine',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							name: '={{ $parameter["stateMachineName"] }}',
							definition: '={{ $parameter["definition"] }}',
							roleArn: '={{ $parameter["roleArn"] }}',
							type: '={{ $parameter["type"] }}',
							loggingConfiguration: '={{ $parameter["loggingConfiguration"] }}',
							tracingConfiguration: '={{ $parameter["tracingConfiguration"] }}',
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
				description: 'Delete a state machine',
				action: 'Delete a state machine',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DeleteStateMachine',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
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
				description: 'Describe a state machine',
				action: 'Describe a state machine',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.DescribeStateMachine',
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
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
				description: 'List state machines',
				action: 'List state machines',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSStepFunctions.ListStateMachines',
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
							'Content-Type': 'application/x-amz-json-1.0',
						},
						body: {
							stateMachineArn: '={{ $parameter["stateMachineArn"] }}',
							definition: '={{ $parameter["definition"] }}',
							roleArn: '={{ $parameter["roleArn"] }}',
							loggingConfiguration: '={{ $parameter["loggingConfiguration"] }}',
							tracingConfiguration: '={{ $parameter["tracingConfiguration"] }}',
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
		displayName: 'State Machine Name',
		name: 'stateMachineName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the state machine (1-80 characters)',
	},
	{
		displayName: 'Definition',
		name: 'definition',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Amazon States Language definition (JSON string)',
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
		description: 'IAM role ARN for execution',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'STANDARD',
				value: 'STANDARD',
			},
			{
				name: 'EXPRESS',
				value: 'EXPRESS',
			},
		],
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create'],
			},
		},
		default: 'STANDARD',
		description: 'Type of state machine',
	},
	{
		displayName: 'Logging Configuration',
		name: 'loggingConfiguration',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create', 'update'],
			},
		},
		default: '{}',
		description: 'Logging configuration for the state machine',
	},
	{
		displayName: 'Tracing Configuration',
		name: 'tracingConfiguration',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create', 'update'],
			},
		},
		default: '{}',
		description: 'X-Ray tracing configuration',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of {key, value} tag objects',
	},
	// Delete/Describe/Update operation fields
	{
		displayName: 'State Machine ARN',
		name: 'stateMachineArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stateMachine'],
				operation: ['delete', 'describe', 'update'],
			},
		},
		default: '',
		description: 'ARN of the state machine',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['stateMachine'],
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
				resource: ['stateMachine'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];

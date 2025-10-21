import type { INodeProperties } from 'n8n-workflow';

export const quantumTaskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['quantumTask'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a quantum task',
				action: 'Cancel a quantum task',
				routing: {
					request: {
						method: 'PUT',
						url: '=/quantum-task/{{$parameter["quantumTaskArn"]}}/cancel',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a quantum task',
				action: 'Create a quantum task',
				routing: {
					request: {
						method: 'POST',
						url: '/quantum-task',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get quantum task details',
				action: 'Get a quantum task',
				routing: {
					request: {
						method: 'GET',
						url: '=/quantum-task/{{$parameter["quantumTaskArn"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List quantum tasks',
				action: 'Get many quantum tasks',
				routing: {
					request: {
						method: 'POST',
						url: '/quantum-tasks',
					},
				},
			},
		],
		default: 'create',
	},
];

export const quantumTaskFields: INodeProperties[] = [
	{
		displayName: 'Quantum Task ARN',
		name: 'quantumTaskArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['quantumTask'],
				operation: ['get', 'cancel'],
			},
		},
		default: '',
		description: 'The ARN of the quantum task',
	},
	{
		displayName: 'Device ARN',
		name: 'deviceArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['quantumTask'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					deviceArn: '={{ $value }}',
				},
			},
		},
		description: 'The ARN of the quantum device',
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['quantumTask'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					action: '={{ $value }}',
				},
			},
		},
		description: 'The quantum circuit or annealing problem (JSON string)',
	},
	{
		displayName: 'Output S3 Bucket',
		name: 'outputS3Bucket',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['quantumTask'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					outputS3Bucket: '={{ $value }}',
				},
			},
		},
		description: 'The S3 bucket for output results',
	},
	{
		displayName: 'Output S3 Key Prefix',
		name: 'outputS3KeyPrefix',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['quantumTask'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					outputS3KeyPrefix: '={{ $value }}',
				},
			},
		},
		description: 'The S3 key prefix for output results',
	},
	{
		displayName: 'Shots',
		name: 'shots',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['quantumTask'],
				operation: ['create'],
			},
		},
		default: 100,
		routing: {
			request: {
				body: {
					shots: '={{ $value }}',
				},
			},
		},
		description: 'The number of times to run the quantum task',
	},
	{
		displayName: 'Device Parameters',
		name: 'deviceParameters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['quantumTask'],
				operation: ['create'],
			},
		},
		default: '{}',
		routing: {
			request: {
				body: {
					deviceParameters: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'Device-specific parameters',
	},
];

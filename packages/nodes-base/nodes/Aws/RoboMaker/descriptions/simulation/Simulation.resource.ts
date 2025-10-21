import type { INodeProperties } from 'n8n-workflow';

export const simulationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['simulation'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a simulation job',
				action: 'Cancel a simulation',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'robomaker.CancelSimulationJob',
						},
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a simulation job',
				action: 'Create a simulation',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'robomaker.CreateSimulationJob',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get simulation job details',
				action: 'Get a simulation',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'robomaker.DescribeSimulationJob',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List simulation jobs',
				action: 'Get many simulations',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'robomaker.ListSimulationJobs',
						},
					},
				},
			},
		],
		default: 'create',
	},
];

export const simulationFields: INodeProperties[] = [
	{
		displayName: 'Job ARN',
		name: 'job',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['simulation'],
				operation: ['get', 'cancel'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					job: '={{ $value }}',
				},
			},
		},
		description: 'The ARN of the simulation job',
	},
	{
		displayName: 'IAM Role',
		name: 'iamRole',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['simulation'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					iamRole: '={{ $value }}',
				},
			},
		},
		description: 'The IAM role ARN for the simulation',
	},
	{
		displayName: 'Max Job Duration',
		name: 'maxJobDurationInSeconds',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['simulation'],
				operation: ['create'],
			},
		},
		default: 3600,
		routing: {
			request: {
				body: {
					maxJobDurationInSeconds: '={{ $value }}',
				},
			},
		},
		description: 'Maximum duration of the simulation in seconds',
	},
	{
		displayName: 'Robot Applications',
		name: 'robotApplications',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['simulation'],
				operation: ['create'],
			},
		},
		default: '[{"application": "arn:aws:robomaker:region:account:robot-application/app-id", "launchConfig": {"packageName": "hello_world", "launchFile": "rotate.launch"}}]',
		routing: {
			request: {
				body: {
					robotApplications: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'The robot applications to use in the simulation',
	},
	{
		displayName: 'Simulation Applications',
		name: 'simulationApplications',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['simulation'],
				operation: ['create'],
			},
		},
		default: '[{"application": "arn:aws:robomaker:region:account:simulation-application/app-id", "launchConfig": {"packageName": "hello_world_simulation", "launchFile": "empty_world.launch"}}]',
		routing: {
			request: {
				body: {
					simulationApplications: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'The simulation applications to use',
	},
	{
		displayName: 'Output Location',
		name: 'outputLocation',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['simulation'],
				operation: ['create'],
			},
		},
		default: '{"s3Bucket": "my-bucket", "s3Prefix": "simulation-output"}',
		routing: {
			request: {
				body: {
					outputLocation: '={{ JSON.parse($value) }}',
				},
			},
		},
		description: 'The output location for simulation logs',
	},
];

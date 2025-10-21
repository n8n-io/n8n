import type { INodeProperties } from 'n8n-workflow';

export const taskDefinitionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['taskDefinition'],
			},
		},
		options: [
			{
				name: 'Deregister',
				value: 'deregister',
				description: 'Deregister a task definition',
				action: 'Deregister a task definition',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DeregisterTaskDefinition',
						},
						body: {
							taskDefinition: '={{ $parameter["taskDefinition"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a task definition',
				action: 'Describe a task definition',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DescribeTaskDefinition',
						},
						body: {
							taskDefinition: '={{ $parameter["taskDefinition"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List task definitions',
				action: 'List task definitions',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.ListTaskDefinitions',
						},
					},
				},
			},
			{
				name: 'Register',
				value: 'register',
				description: 'Register a new task definition',
				action: 'Register a task definition',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.RegisterTaskDefinition',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const taskDefinitionFields: INodeProperties[] = [
	{
		displayName: 'Task Definition',
		name: 'taskDefinition',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['taskDefinition'],
				operation: ['describe', 'deregister'],
			},
		},
		default: '',
		description: 'The family and revision (family:revision) or full ARN',
	},
	{
		displayName: 'Family',
		name: 'family',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['taskDefinition'],
				operation: ['register'],
			},
		},
		default: '',
		description: 'Task definition family name',
		routing: {
			request: {
				body: {
					family: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Container Definitions',
		name: 'containerDefinitions',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['taskDefinition'],
				operation: ['register'],
			},
		},
		default: '[{"name":"app","image":"nginx:latest","memory":512,"essential":true}]',
		description: 'Array of container definitions',
		routing: {
			request: {
				body: {
					containerDefinitions: '={{ JSON.parse($value) }}',
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
				resource: ['taskDefinition'],
				operation: ['register'],
			},
		},
		options: [
			{
				displayName: 'CPU',
				name: 'cpu',
				type: 'string',
				default: '256',
				description: 'CPU units (256, 512, 1024, 2048, 4096)',
				routing: {
					request: {
						body: {
							cpu: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Memory',
				name: 'memory',
				type: 'string',
				default: '512',
				description: 'Memory in MB (512, 1024, 2048, etc.)',
				routing: {
					request: {
						body: {
							memory: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Network Mode',
				name: 'networkMode',
				type: 'options',
				options: [
					{ name: 'Bridge', value: 'bridge' },
					{ name: 'Host', value: 'host' },
					{ name: 'AWS VPC', value: 'awsvpc' },
					{ name: 'None', value: 'none' },
				],
				default: 'awsvpc',
				description: 'Docker networking mode',
				routing: {
					request: {
						body: {
							networkMode: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Requires Compatibilities',
				name: 'requiresCompatibilities',
				type: 'multiOptions',
				options: [
					{ name: 'EC2', value: 'EC2' },
					{ name: 'Fargate', value: 'FARGATE' },
				],
				default: ['FARGATE'],
				description: 'Launch type requirements',
				routing: {
					request: {
						body: {
							requiresCompatibilities: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Task Role ARN',
				name: 'taskRoleArn',
				type: 'string',
				default: '',
				description: 'IAM role for the task',
				routing: {
					request: {
						body: {
							taskRoleArn: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Execution Role ARN',
				name: 'executionRoleArn',
				type: 'string',
				default: '',
				description: 'IAM role for ECS agent and Docker daemon',
				routing: {
					request: {
						body: {
							executionRoleArn: '={{ $value }}',
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
				resource: ['taskDefinition'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				options: [
					{ name: 'Tags', value: 'TAGS' },
				],
				default: [],
				description: 'Additional information to include',
				routing: {
					request: {
						body: {
							include: '={{ $value }}',
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
				resource: ['taskDefinition'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Family Prefix',
				name: 'familyPrefix',
				type: 'string',
				default: '',
				description: 'Filter by family name prefix',
				routing: {
					request: {
						body: {
							familyPrefix: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Inactive', value: 'INACTIVE' },
				],
				default: 'ACTIVE',
				description: 'Filter by status',
				routing: {
					request: {
						body: {
							status: '={{ $value }}',
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
					maxValue: 100,
				},
				default: 100,
				description: 'Maximum number of results',
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
				description: 'Pagination token',
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

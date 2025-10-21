import type { INodeProperties } from 'n8n-workflow';

export const serviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['service'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new service',
				action: 'Create a service',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.CreateService',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a service',
				action: 'Delete a service',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DeleteService',
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
							service: '={{ $parameter["service"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about services',
				action: 'Describe services',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DescribeServices',
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List services in a cluster',
				action: 'List services',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.ListServices',
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a service',
				action: 'Update a service',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.UpdateService',
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
							service: '={{ $parameter["service"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const serviceFields: INodeProperties[] = [
	{
		displayName: 'Cluster',
		name: 'cluster',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['service'],
			},
		},
		default: 'default',
		description: 'The name or ARN of the cluster',
	},
	{
		displayName: 'Service',
		name: 'service',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['service'],
				operation: ['delete', 'update'],
			},
		},
		default: '',
		description: 'The name or ARN of the service',
	},
	{
		displayName: 'Service Name',
		name: 'serviceName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['service'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the service',
		routing: {
			request: {
				body: {
					serviceName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Task Definition',
		name: 'taskDefinition',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['service'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Task definition family:revision or ARN',
		routing: {
			request: {
				body: {
					taskDefinition: '={{ $value }}',
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
				resource: ['service'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Desired Count',
				name: 'desiredCount',
				type: 'number',
				default: 1,
				description: 'Number of task instances to run',
				routing: {
					request: {
						body: {
							desiredCount: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Launch Type',
				name: 'launchType',
				type: 'options',
				options: [
					{ name: 'EC2', value: 'EC2' },
					{ name: 'Fargate', value: 'FARGATE' },
				],
				default: 'FARGATE',
				description: 'Launch type for the service',
				routing: {
					request: {
						body: {
							launchType: '={{ $value }}',
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
				resource: ['service'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Desired Count',
				name: 'desiredCount',
				type: 'number',
				default: 1,
				description: 'New desired task count',
				routing: {
					request: {
						body: {
							desiredCount: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Task Definition',
				name: 'taskDefinition',
				type: 'string',
				default: '',
				description: 'New task definition',
				routing: {
					request: {
						body: {
							taskDefinition: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Force New Deployment',
				name: 'forceNewDeployment',
				type: 'boolean',
				default: false,
				description: 'Whether to force a new deployment',
				routing: {
					request: {
						body: {
							forceNewDeployment: '={{ $value }}',
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
				resource: ['service'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Services',
				name: 'services',
				type: 'string',
				default: '',
				description: 'Comma-separated list of service names or ARNs',
				routing: {
					request: {
						body: {
							services: '={{ $value.split(",").map(v => v.trim()) }}',
						},
					},
				},
			},
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
				resource: ['service'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Launch Type',
				name: 'launchType',
				type: 'options',
				options: [
					{ name: 'EC2', value: 'EC2' },
					{ name: 'Fargate', value: 'FARGATE' },
				],
				default: 'FARGATE',
				description: 'Filter by launch type',
				routing: {
					request: {
						body: {
							launchType: '={{ $value }}',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['service'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Force',
				name: 'force',
				type: 'boolean',
				default: false,
				description: 'Whether to force delete without draining tasks',
				routing: {
					request: {
						body: {
							force: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];

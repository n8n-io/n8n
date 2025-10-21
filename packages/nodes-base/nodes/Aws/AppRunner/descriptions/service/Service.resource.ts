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
							'X-Amz-Target': 'AppRunner.CreateService',
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
							'X-Amz-Target': 'AppRunner.DeleteService',
						},
						body: {
							ServiceArn: '={{ $parameter["serviceArn"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a service',
				action: 'Describe a service',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AppRunner.DescribeService',
						},
						body: {
							ServiceArn: '={{ $parameter["serviceArn"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all services',
				action: 'List services',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AppRunner.ListServices',
						},
					},
				},
			},
			{
				name: 'Pause',
				value: 'pause',
				description: 'Pause a service',
				action: 'Pause a service',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AppRunner.PauseService',
						},
						body: {
							ServiceArn: '={{ $parameter["serviceArn"] }}',
						},
					},
				},
			},
			{
				name: 'Resume',
				value: 'resume',
				description: 'Resume a paused service',
				action: 'Resume a service',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AppRunner.ResumeService',
						},
						body: {
							ServiceArn: '={{ $parameter["serviceArn"] }}',
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
		displayName: 'Service ARN',
		name: 'serviceArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['service'],
				operation: ['describe', 'delete', 'pause', 'resume'],
			},
		},
		default: '',
		description: 'The ARN of the service',
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
					ServiceName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Source Configuration',
		name: 'sourceConfiguration',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['service'],
				operation: ['create'],
			},
		},
		default: '{"ImageRepository":{"ImageIdentifier":"public.ecr.aws/nginx/nginx:latest","ImageRepositoryType":"ECR_PUBLIC"}}',
		description: 'Source configuration (image or code repository)',
		routing: {
			request: {
				body: {
					SourceConfiguration: '={{ JSON.parse($value) }}',
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
				displayName: 'Instance Configuration',
				name: 'instanceConfiguration',
				type: 'json',
				default: '{"Cpu":"1 vCPU","Memory":"2 GB"}',
				description: 'Instance CPU and memory configuration',
				routing: {
					request: {
						body: {
							InstanceConfiguration: '={{ JSON.parse($value) }}',
						},
					},
				},
			},
			{
				displayName: 'Auto Scaling Configuration ARN',
				name: 'autoScalingConfigurationArn',
				type: 'string',
				default: '',
				description: 'ARN of auto scaling configuration',
				routing: {
					request: {
						body: {
							AutoScalingConfigurationArn: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Health Check Configuration',
				name: 'healthCheckConfiguration',
				type: 'json',
				default: '{"Protocol":"TCP","Path":"/","Interval":10,"Timeout":5,"HealthyThreshold":1,"UnhealthyThreshold":5}',
				description: 'Health check configuration',
				routing: {
					request: {
						body: {
							HealthCheckConfiguration: '={{ JSON.parse($value) }}',
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
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 20,
				description: 'Maximum number of results',
				routing: {
					request: {
						body: {
							MaxResults: '={{ $value }}',
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
							NextToken: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];

import type { INodeProperties } from 'n8n-workflow';

export const deploymentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deployment'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new deployment',
				action: 'Create a deployment',
				routing: {
					request: {
						method: 'POST',
						url: '=/restapis/{{$parameter["restApiId"]}}/deployments',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deployment',
				action: 'Delete a deployment',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/restapis/{{$parameter["restApiId"]}}/deployments/{{$parameter["deploymentId"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a deployment',
				action: 'Get a deployment',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{$parameter["restApiId"]}}/deployments/{{$parameter["deploymentId"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List deployments for an API',
				action: 'List deployments',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{$parameter["restApiId"]}}/deployments',
					},
				},
			},
		],
		default: 'list',
	},
];

export const deploymentFields: INodeProperties[] = [
	{
		displayName: 'REST API ID',
		name: 'restApiId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['deployment'],
			},
		},
		default: '',
		description: 'The ID of the REST API',
	},
	{
		displayName: 'Deployment ID',
		name: 'deploymentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		description: 'The ID of the deployment',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Stage Name',
				name: 'stageName',
				type: 'string',
				default: '',
				description: 'Stage name for the deployment',
				routing: {
					request: {
						body: {
							stageName: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Stage Description',
				name: 'stageDescription',
				type: 'string',
				default: '',
				description: 'Description of the stage',
				routing: {
					request: {
						body: {
							stageDescription: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the deployment',
				routing: {
					request: {
						body: {
							description: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Cache Cluster Enabled',
				name: 'cacheClusterEnabled',
				type: 'boolean',
				default: false,
				description: 'Whether to enable the cache cluster',
				routing: {
					request: {
						body: {
							cacheClusterEnabled: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Cache Cluster Size',
				name: 'cacheClusterSize',
				type: 'options',
				options: [
					{ name: '0.5 GB', value: '0.5' },
					{ name: '1.6 GB', value: '1.6' },
					{ name: '6.1 GB', value: '6.1' },
					{ name: '13.5 GB', value: '13.5' },
					{ name: '28.4 GB', value: '28.4' },
					{ name: '58.2 GB', value: '58.2' },
					{ name: '118 GB', value: '118' },
					{ name: '237 GB', value: '237' },
				],
				default: '0.5',
				description: 'Cache cluster size',
				routing: {
					request: {
						body: {
							cacheClusterSize: '={{ $value }}',
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
							tracingEnabled: '={{ $value }}',
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
				resource: ['deployment'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 25,
				description: 'Maximum number of deployments to return',
				routing: {
					request: {
						qs: {
							limit: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'string',
				default: '',
				description: 'Pagination token from previous response',
				routing: {
					request: {
						qs: {
							position: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];

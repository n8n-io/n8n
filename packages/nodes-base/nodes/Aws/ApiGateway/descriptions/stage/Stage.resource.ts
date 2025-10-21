import type { INodeProperties } from 'n8n-workflow';

export const stageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['stage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new stage',
				action: 'Create a stage',
				routing: {
					request: {
						method: 'POST',
						url: '=/restapis/{{$parameter["restApiId"]}}/stages',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a stage',
				action: 'Delete a stage',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/restapis/{{$parameter["restApiId"]}}/stages/{{$parameter["stageName"]}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a stage',
				action: 'Get a stage',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{$parameter["restApiId"]}}/stages/{{$parameter["stageName"]}}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List stages for an API',
				action: 'List stages',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{$parameter["restApiId"]}}/stages',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a stage',
				action: 'Update a stage',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/restapis/{{$parameter["restApiId"]}}/stages/{{$parameter["stageName"]}}',
					},
				},
			},
		],
		default: 'list',
	},
];

export const stageFields: INodeProperties[] = [
	{
		displayName: 'REST API ID',
		name: 'restApiId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stage'],
			},
		},
		default: '',
		description: 'The ID of the REST API',
	},
	{
		displayName: 'Stage Name',
		name: 'stageName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stage'],
				operation: ['create', 'get', 'delete', 'update'],
			},
		},
		default: '',
		description: 'The name of the stage',
		routing: {
			request: {
				body: {
					stageName: '={{ $value }}',
				},
			},
			send: {
				preSend: [
					async function (this, requestOptions) {
						if (requestOptions.method !== 'POST') {
							delete (requestOptions.body as any)?.stageName;
						}
						return requestOptions;
					},
				],
			},
		},
	},
	{
		displayName: 'Deployment ID',
		name: 'deploymentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stage'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The ID of the deployment',
		routing: {
			request: {
				body: {
					deploymentId: '={{ $value }}',
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
				resource: ['stage'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the stage',
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
		displayName: 'Patch Operations',
		name: 'patchOperations',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['stage'],
				operation: ['update'],
			},
		},
		default: '[{"op":"replace","path":"/description","value":"Updated stage"}]',
		description: 'Array of patch operations to perform',
		routing: {
			request: {
				body: {
					patchOperations: '={{ JSON.parse($value) }}',
				},
			},
		},
	},
];

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
						url: '=/restapis/{{ $parameter["restApiId"] }}/deployments',
						body: {
							stageName: '={{ $parameter["stageName"] }}',
							stageDescription: '={{ $parameter["stageDescription"] }}',
							description: '={{ $parameter["description"] }}',
							cacheClusterEnabled: '={{ $parameter["cacheClusterEnabled"] }}',
							cacheClusterSize: '={{ $parameter["cacheClusterSize"] }}',
							variables: '={{ $parameter["variables"] }}',
							tracingEnabled: '={{ $parameter["tracingEnabled"] }}',
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
				description: 'Delete a deployment',
				action: 'Delete a deployment',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/restapis/{{ $parameter["restApiId"] }}/deployments/{{ $parameter["deploymentId"] }}',
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deployment',
				action: 'Get a deployment',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{ $parameter["restApiId"] }}/deployments/{{ $parameter["deploymentId"] }}',
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
				description: 'List all deployments',
				action: 'List deployments',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{ $parameter["restApiId"] }}/deployments',
						qs: {
							limit: '={{ $parameter["limit"] }}',
							position: '={{ $parameter["position"] }}',
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
	// Common fields
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
		description: 'The identifier of the REST API',
	},
	// Create operation fields
	{
		displayName: 'Stage Name',
		name: 'stageName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the stage for the deployment',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Description of the deployment',
	},
	{
		displayName: 'Stage Description',
		name: 'stageDescription',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Description of the stage',
	},
	{
		displayName: 'Cache Cluster Enabled',
		name: 'cacheClusterEnabled',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether to enable caching for the deployment',
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
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['create'],
				cacheClusterEnabled: [true],
			},
		},
		default: '0.5',
		description: 'Size of the cache cluster',
	},
	{
		displayName: 'Variables',
		name: 'variables',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Stage variables',
	},
	{
		displayName: 'Tracing Enabled',
		name: 'tracingEnabled',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether to enable X-Ray tracing',
	},
	// Get/Delete operation fields
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
		description: 'The identifier of the deployment',
	},
	// List operation fields
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['list'],
			},
		},
		default: 25,
		description: 'Maximum number of results to return (1-500)',
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['deployment'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];

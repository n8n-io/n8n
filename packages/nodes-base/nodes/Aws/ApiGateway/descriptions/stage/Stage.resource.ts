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
						url: '=/restapis/{{ $parameter["restApiId"] }}/stages',
						body: {
							stageName: '={{ $parameter["stageName"] }}',
							deploymentId: '={{ $parameter["deploymentId"] }}',
							description: '={{ $parameter["description"] }}',
							cacheClusterEnabled: '={{ $parameter["cacheClusterEnabled"] }}',
							cacheClusterSize: '={{ $parameter["cacheClusterSize"] }}',
							variables: '={{ $parameter["variables"] }}',
							tracingEnabled: '={{ $parameter["tracingEnabled"] }}',
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
				description: 'Delete a stage',
				action: 'Delete a stage',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/restapis/{{ $parameter["restApiId"] }}/stages/{{ $parameter["stageName"] }}',
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
				description: 'Get a stage',
				action: 'Get a stage',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{ $parameter["restApiId"] }}/stages/{{ $parameter["stageName"] }}',
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
				description: 'List all stages',
				action: 'List stages',
				routing: {
					request: {
						method: 'GET',
						url: '=/restapis/{{ $parameter["restApiId"] }}/stages',
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
				description: 'Update a stage',
				action: 'Update a stage',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/restapis/{{ $parameter["restApiId"] }}/stages/{{ $parameter["stageName"] }}',
						body: {
							patchOperations: '={{ $parameter["patchOperations"] }}',
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
				resource: ['stage'],
			},
		},
		default: '',
		description: 'The identifier of the REST API',
	},
	{
		displayName: 'Stage Name',
		name: 'stageName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stage'],
			},
		},
		default: '',
		description: 'The name of the stage',
	},
	// Create operation fields
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
		description: 'The deployment ID to associate with the stage',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['stage'],
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
				resource: ['stage'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether to enable caching for the stage',
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
				resource: ['stage'],
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
				resource: ['stage'],
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
				resource: ['stage'],
				operation: ['create'],
			},
		},
		default: false,
		description: 'Whether to enable X-Ray tracing',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['stage'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Key-value pairs for tagging',
	},
	// Update operation fields
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
		default: '[]',
		description: 'Array of patch operations to apply',
	},
];

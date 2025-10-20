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
				resource: ['cluster'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a cluster',
				action: 'Create a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.CreateCluster',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							clusterName: '={{ $parameter["clusterName"] }}',
							capacityProviders: '={{ $parameter["capacityProviders"] }}',
							defaultCapacityProviderStrategy: '={{ $parameter["defaultCapacityProviderStrategy"] }}',
							configuration: '={{ $parameter["configuration"] }}',
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
				description: 'Delete a cluster',
				action: 'Delete a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DeleteCluster',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							cluster: '={{ $parameter["clusterName"] }}',
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
				description: 'Describe clusters',
				action: 'Describe clusters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DescribeClusters',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							clusters: '={{ $parameter["clusters"] }}',
							include: '={{ $parameter["include"] }}',
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
				description: 'List clusters',
				action: 'List clusters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.ListClusters',
							'Content-Type': 'application/x-amz-json-1.1',
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
		],
	},
	// Create operation fields
	{
		displayName: 'Cluster Name',
		name: 'clusterName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'delete'],
			},
		},
		default: '',
		description: 'The name of the cluster (max 255 characters)',
	},
	{
		displayName: 'Capacity Providers',
		name: 'capacityProviders',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of capacity provider names (FARGATE, FARGATE_SPOT, or custom)',
	},
	{
		displayName: 'Default Capacity Provider Strategy',
		name: 'defaultCapacityProviderStrategy',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of capacity provider strategy objects',
	},
	{
		displayName: 'Configuration',
		name: 'configuration',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '{}',
		description: 'Cluster configuration (ECS Exec, storage encryption)',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of tag objects',
	},
	// Describe operation fields
	{
		displayName: 'Clusters',
		name: 'clusters',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['describe'],
			},
		},
		default: '[]',
		description: 'Array of cluster names or ARNs',
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['describe'],
			},
		},
		default: '[]',
		description: 'Additional information to include (ATTACHMENTS, SETTINGS, STATISTICS, TAGS)',
	},
	// List operation fields
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of results to return (1-100)',
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Pagination token from previous response',
	},
];

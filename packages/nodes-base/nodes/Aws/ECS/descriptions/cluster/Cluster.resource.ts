import type { INodeProperties } from 'n8n-workflow';

export const clusterOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new cluster',
				action: 'Create a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.CreateCluster',
						},
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
						},
						body: {
							cluster: '={{ $parameter["cluster"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about clusters',
				action: 'Describe clusters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.DescribeClusters',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all clusters',
				action: 'List clusters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AmazonEC2ContainerServiceV20141113.ListClusters',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const clusterFields: INodeProperties[] = [
	{
		displayName: 'Cluster',
		name: 'cluster',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The name or ARN of the cluster',
	},
	{
		displayName: 'Cluster Name',
		name: 'clusterName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the cluster (max 255 characters)',
		routing: {
			request: {
				body: {
					clusterName: '={{ $value }}',
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
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Capacity Providers',
				name: 'capacityProviders',
				type: 'string',
				default: '',
				description: 'Comma-separated list of capacity providers (FARGATE, FARGATE_SPOT, or custom)',
				routing: {
					request: {
						body: {
							capacityProviders: '={{ $value.split(",").map(v => v.trim()) }}',
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
				resource: ['cluster'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Clusters',
				name: 'clusters',
				type: 'string',
				default: '',
				description: 'Comma-separated list of cluster names or ARNs',
				routing: {
					request: {
						body: {
							clusters: '={{ $value.split(",").map(v => v.trim()) }}',
						},
					},
				},
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				options: [
					{ name: 'Attachments', value: 'ATTACHMENTS' },
					{ name: 'Settings', value: 'SETTINGS' },
					{ name: 'Statistics', value: 'STATISTICS' },
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
				resource: ['cluster'],
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
				default: 100,
				description: 'Maximum number of results to return',
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
				description: 'Pagination token from previous response',
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

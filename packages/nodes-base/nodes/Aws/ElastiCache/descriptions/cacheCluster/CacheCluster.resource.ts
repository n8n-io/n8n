import type { INodeProperties } from 'n8n-workflow';
import { API_VERSION } from '../../helpers/constants';
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
				resource: ['cacheCluster'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a cache cluster',
				action: 'Create a cache cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateCacheCluster',
							Version: API_VERSION,
							CacheClusterId: '={{ $parameter["cacheClusterId"] }}',
							Engine: '={{ $parameter["engine"] }}',
							CacheNodeType: '={{ $parameter["cacheNodeType"] }}',
							NumCacheNodes: '={{ $parameter["numCacheNodes"] }}',
							EngineVersion: '={{ $parameter["engineVersion"] }}',
							Port: '={{ $parameter["port"] }}',
							CacheSubnetGroupName: '={{ $parameter["cacheSubnetGroupName"] }}',
							SecurityGroupIds: '={{ $parameter["securityGroupIds"] }}',
							PreferredMaintenanceWindow: '={{ $parameter["preferredMaintenanceWindow"] }}',
							SnapshotRetentionLimit: '={{ $parameter["snapshotRetentionLimit"] }}',
							Tags: '={{ $parameter["tags"] }}',
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
				description: 'Delete a cache cluster',
				action: 'Delete a cache cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteCacheCluster',
							Version: API_VERSION,
							CacheClusterId: '={{ $parameter["cacheClusterId"] }}',
							FinalSnapshotIdentifier: '={{ $parameter["finalSnapshotIdentifier"] }}',
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
				description: 'Describe cache clusters',
				action: 'Describe cache clusters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeCacheClusters',
							Version: API_VERSION,
							CacheClusterId: '={{ $parameter["cacheClusterId"] }}',
							MaxRecords: '={{ $parameter["maxRecords"] }}',
							Marker: '={{ $parameter["marker"] }}',
							ShowCacheNodeInfo: '={{ $parameter["showCacheNodeInfo"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Modify',
				value: 'modify',
				description: 'Modify a cache cluster',
				action: 'Modify a cache cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ModifyCacheCluster',
							Version: API_VERSION,
							CacheClusterId: '={{ $parameter["cacheClusterId"] }}',
							NumCacheNodes: '={{ $parameter["numCacheNodes"] }}',
							CacheNodeType: '={{ $parameter["cacheNodeType"] }}',
							EngineVersion: '={{ $parameter["engineVersion"] }}',
							ApplyImmediately: '={{ $parameter["applyImmediately"] }}',
							SnapshotRetentionLimit: '={{ $parameter["snapshotRetentionLimit"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Reboot',
				value: 'reboot',
				description: 'Reboot cache cluster nodes',
				action: 'Reboot cache cluster nodes',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'RebootCacheCluster',
							Version: API_VERSION,
							CacheClusterId: '={{ $parameter["cacheClusterId"] }}',
							CacheNodeIdsToReboot: '={{ $parameter["cacheNodeIdsToReboot"] }}',
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
	// Common field
	{
		displayName: 'Cache Cluster ID',
		name: 'cacheClusterId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
			},
		},
		default: '',
		description: 'Unique identifier for the cache cluster',
	},
	// Create operation fields
	{
		displayName: 'Engine',
		name: 'engine',
		type: 'options',
		options: [
			{ name: 'Redis', value: 'redis' },
			{ name: 'Memcached', value: 'memcached' },
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create'],
			},
		},
		default: 'redis',
		description: 'Cache engine to use',
	},
	{
		displayName: 'Cache Node Type',
		name: 'cacheNodeType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create', 'modify'],
			},
		},
		default: 'cache.t3.micro',
		description: 'Instance type (e.g., cache.t3.micro, cache.r6g.large)',
	},
	{
		displayName: 'Number of Cache Nodes',
		name: 'numCacheNodes',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create', 'modify'],
			},
		},
		default: 1,
		description: 'Number of cache nodes in the cluster',
	},
	{
		displayName: 'Engine Version',
		name: 'engineVersion',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create', 'modify'],
			},
		},
		default: '',
		description: 'Version of the cache engine',
	},
	{
		displayName: 'Port',
		name: 'port',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create'],
			},
		},
		default: 6379,
		description: 'Port number for the cache cluster',
	},
	{
		displayName: 'Cache Subnet Group Name',
		name: 'cacheSubnetGroupName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the cache subnet group',
	},
	{
		displayName: 'Security Group IDs',
		name: 'securityGroupIds',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of security group IDs',
	},
	{
		displayName: 'Preferred Maintenance Window',
		name: 'preferredMaintenanceWindow',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Maintenance window (e.g., sun:05:00-sun:09:00)',
	},
	{
		displayName: 'Snapshot Retention Limit',
		name: 'snapshotRetentionLimit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create', 'modify'],
			},
		},
		default: 0,
		description: 'Number of days to retain snapshots',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Array of tag objects',
	},
	// Delete operation fields
	{
		displayName: 'Final Snapshot Identifier',
		name: 'finalSnapshotIdentifier',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'Name of final snapshot before deletion',
	},
	// Describe operation fields
	{
		displayName: 'Max Records',
		name: 'maxRecords',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['describe'],
			},
		},
		default: 100,
		description: 'Maximum number of records to return',
	},
	{
		displayName: 'Marker',
		name: 'marker',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['describe'],
			},
		},
		default: '',
		description: 'Pagination marker from previous response',
	},
	{
		displayName: 'Show Cache Node Info',
		name: 'showCacheNodeInfo',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['describe'],
			},
		},
		default: false,
		description: 'Whether to include cache node information',
	},
	// Modify operation fields
	{
		displayName: 'Apply Immediately',
		name: 'applyImmediately',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['modify'],
			},
		},
		default: false,
		description: 'Whether to apply changes immediately',
	},
	// Reboot operation fields
	{
		displayName: 'Cache Node IDs to Reboot',
		name: 'cacheNodeIdsToReboot',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['cacheCluster'],
				operation: ['reboot'],
			},
		},
		default: '[]',
		description: 'Array of cache node IDs to reboot',
	},
];

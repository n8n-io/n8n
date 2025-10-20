import type { INodeProperties } from 'n8n-workflow';

export const snapshotOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['snapshot'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a manual snapshot',
				action: 'Create a snapshot',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateClusterSnapshot',
							Version: '2012-12-01',
							SnapshotIdentifier: '={{ $parameter["snapshotIdentifier"] }}',
							ClusterIdentifier: '={{ $parameter["clusterIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a snapshot',
				action: 'Delete a snapshot',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteClusterSnapshot',
							Version: '2012-12-01',
							SnapshotIdentifier: '={{ $parameter["snapshotIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a snapshot',
				action: 'Describe a snapshot',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeClusterSnapshots',
							Version: '2012-12-01',
							SnapshotIdentifier: '={{ $parameter["snapshotIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all snapshots',
				action: 'List snapshots',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeClusterSnapshots',
							Version: '2012-12-01',
						},
					},
				},
			},
			{
				name: 'Restore',
				value: 'restore',
				description: 'Restore a cluster from a snapshot',
				action: 'Restore from snapshot',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'RestoreFromClusterSnapshot',
							Version: '2012-12-01',
							ClusterIdentifier: '={{ $parameter["clusterIdentifier"] }}',
							SnapshotIdentifier: '={{ $parameter["snapshotIdentifier"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const snapshotFields: INodeProperties[] = [
	{
		displayName: 'Snapshot Identifier',
		name: 'snapshotIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['snapshot'],
				operation: ['create', 'delete', 'describe', 'restore'],
			},
		},
		default: '',
		description: 'The unique identifier for the snapshot',
	},
	{
		displayName: 'Cluster Identifier',
		name: 'clusterIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['snapshot'],
				operation: ['create', 'restore'],
			},
		},
		default: '',
		description: 'The identifier of the cluster',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['snapshot'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Manual Snapshot Retention Period',
				name: 'ManualSnapshotRetentionPeriod',
				type: 'number',
				default: -1,
				description: 'Number of days to retain the snapshot (-1 for indefinite)',
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
				resource: ['snapshot'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Cluster Identifier',
				name: 'ClusterIdentifier',
				type: 'string',
				default: '',
				description: 'Filter by cluster identifier',
			},
			{
				displayName: 'Snapshot Type',
				name: 'SnapshotType',
				type: 'options',
				options: [
					{ name: 'Automated', value: 'automated' },
					{ name: 'Manual', value: 'manual' },
				],
				default: '',
				description: 'Filter by snapshot type',
			},
			{
				displayName: 'Max Records',
				name: 'MaxRecords',
				type: 'number',
				default: 100,
				description: 'Maximum number of records to return',
			},
			{
				displayName: 'Marker',
				name: 'Marker',
				type: 'string',
				default: '',
				description: 'Marker for pagination',
			},
		],
	},
];

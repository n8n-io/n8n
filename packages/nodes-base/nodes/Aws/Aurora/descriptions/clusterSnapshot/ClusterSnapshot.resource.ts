import type { INodeProperties } from 'n8n-workflow';
import { handleAuroraError } from '../../helpers/errorHandler';

export const clusterSnapshotOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['clusterSnapshot'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a snapshot of an Aurora cluster',
				action: 'Create a cluster snapshot',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'CreateDBClusterSnapshot',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'CreateDBClusterSnapshotResult.DBClusterSnapshot',
								},
							},
							handleAuroraError,
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a cluster snapshot',
				action: 'Delete a cluster snapshot',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DeleteDBClusterSnapshot',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DeleteDBClusterSnapshotResult.DBClusterSnapshot',
								},
							},
							handleAuroraError,
						],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details of a cluster snapshot',
				action: 'Describe a cluster snapshot',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DescribeDBClusterSnapshots',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DescribeDBClusterSnapshotsResult.DBClusterSnapshots',
								},
							},
							{
								type: 'filter',
								properties: {
									pass: "{{ $responseItem.DBClusterSnapshotIdentifier === $parameter['snapshotIdentifier'] }}",
								},
							},
							handleAuroraError,
						],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all cluster snapshots',
				action: 'List cluster snapshots',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DescribeDBClusterSnapshots',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DescribeDBClusterSnapshotsResult.DBClusterSnapshots',
								},
							},
							handleAuroraError,
						],
					},
				},
			},
		],
	},
];

export const clusterSnapshotFields: INodeProperties[] = [
	{
		displayName: 'Snapshot Identifier',
		name: 'snapshotIdentifier',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['clusterSnapshot'],
				operation: ['create', 'delete', 'describe'],
			},
		},
		description: 'The identifier for the DB cluster snapshot',
		routing: {
			request: {
				qs: {
					DBClusterSnapshotIdentifier: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Cluster Identifier',
		name: 'clusterIdentifier',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['clusterSnapshot'],
				operation: ['create'],
			},
		},
		description: 'The identifier of the DB cluster to create a snapshot of',
		routing: {
			request: {
				qs: {
					DBClusterIdentifier: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Snapshot Type',
		name: 'snapshotType',
		type: 'options',
		default: 'manual',
		displayOptions: {
			show: {
				resource: ['clusterSnapshot'],
				operation: ['list'],
			},
		},
		options: [
			{
				name: 'All',
				value: '',
			},
			{
				name: 'Automated',
				value: 'automated',
			},
			{
				name: 'Manual',
				value: 'manual',
			},
			{
				name: 'Shared',
				value: 'shared',
			},
			{
				name: 'Public',
				value: 'public',
			},
		],
		description: 'The type of snapshots to list',
		routing: {
			request: {
				qs: {
					SnapshotType: '={{ $value }}',
				},
			},
		},
	},
];

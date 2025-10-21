import type { INodeProperties } from 'n8n-workflow';
import { handleAuroraError } from '../../helpers/errorHandler';

export const clusterOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['cluster'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Aurora cluster',
				action: 'Create a cluster',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'CreateDBCluster',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'CreateDBClusterResult.DBCluster',
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
				description: 'Delete an Aurora cluster',
				action: 'Delete a cluster',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DeleteDBCluster',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DeleteDBClusterResult.DBCluster',
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
				description: 'Get details of an Aurora cluster',
				action: 'Describe a cluster',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DescribeDBClusters',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DescribeDBClustersResult.DBClusters',
								},
							},
							{
								type: 'filter',
								properties: {
									pass: "{{ $responseItem.DBClusterIdentifier === $parameter['clusterIdentifier'] }}",
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
				description: 'List all Aurora clusters',
				action: 'List clusters',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DescribeDBClusters',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'DescribeDBClustersResult.DBClusters',
								},
							},
							handleAuroraError,
						],
					},
				},
			},
			{
				name: 'Modify',
				value: 'modify',
				description: 'Modify an Aurora cluster',
				action: 'Modify a cluster',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'ModifyDBCluster',
							Version: '2014-10-31',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'ModifyDBClusterResult.DBCluster',
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

export const clusterFields: INodeProperties[] = [
	{
		displayName: 'Cluster Identifier',
		name: 'clusterIdentifier',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'delete', 'describe', 'modify'],
			},
		},
		description: 'The DB cluster identifier',
		routing: {
			request: {
				qs: {
					DBClusterIdentifier: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Engine',
		name: 'engine',
		type: 'options',
		required: true,
		default: 'aurora-mysql',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Aurora MySQL',
				value: 'aurora-mysql',
			},
			{
				name: 'Aurora PostgreSQL',
				value: 'aurora-postgresql',
			},
			{
				name: 'Aurora MySQL (Serverless v1)',
				value: 'aurora',
			},
		],
		description: 'The database engine to use',
		routing: {
			request: {
				qs: {
					Engine: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Master Username',
		name: 'masterUsername',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		description: 'The master username for the DB cluster',
		routing: {
			request: {
				qs: {
					MasterUsername: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Master User Password',
		name: 'masterUserPassword',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		description: 'The master password for the DB cluster',
		routing: {
			request: {
				qs: {
					MasterUserPassword: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Database Name',
		name: 'databaseName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		description: 'The name of the initial database',
		routing: {
			request: {
				qs: {
					DatabaseName: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Engine Version',
		name: 'engineVersion',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'modify'],
			},
		},
		description: 'The database engine version',
		routing: {
			request: {
				qs: {
					EngineVersion: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Serverless V2 Scaling',
		name: 'serverlessV2ScalingConfiguration',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		default: {},
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'modify'],
			},
		},
		description: 'Serverless v2 scaling configuration',
		options: [
			{
				name: 'scaling',
				displayName: 'Scaling',
				values: [
					{
						displayName: 'Min Capacity',
						name: 'minCapacity',
						type: 'number',
						default: 0.5,
						description: 'The minimum capacity for the cluster',
						routing: {
							request: {
								qs: {
									'ServerlessV2ScalingConfiguration.MinCapacity': '={{ $value }}',
								},
							},
						},
					},
					{
						displayName: 'Max Capacity',
						name: 'maxCapacity',
						type: 'number',
						default: 1,
						description: 'The maximum capacity for the cluster',
						routing: {
							request: {
								qs: {
									'ServerlessV2ScalingConfiguration.MaxCapacity': '={{ $value }}',
								},
							},
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Skip Final Snapshot',
		name: 'skipFinalSnapshot',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['delete'],
			},
		},
		description: 'Whether to skip the final DB snapshot',
		routing: {
			request: {
				qs: {
					SkipFinalSnapshot: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Final Snapshot Identifier',
		name: 'finalSnapshotIdentifier',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['delete'],
				skipFinalSnapshot: [false],
			},
		},
		description: 'The final snapshot identifier',
		routing: {
			request: {
				qs: {
					FinalDBSnapshotIdentifier: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Apply Immediately',
		name: 'applyImmediately',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['modify'],
			},
		},
		description: 'Whether to apply changes immediately',
		routing: {
			request: {
				qs: {
					ApplyImmediately: '={{ $value }}',
				},
			},
		},
	},
];

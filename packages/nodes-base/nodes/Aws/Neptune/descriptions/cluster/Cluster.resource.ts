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
				description: 'Create a Neptune cluster',
				action: 'Create a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateDBCluster',
							Version: '2014-10-31',
							DBClusterIdentifier: '={{ $parameter["dbClusterIdentifier"] }}',
							Engine: 'neptune',
							MasterUsername: '={{ $parameter["masterUsername"] }}',
							MasterUserPassword: '={{ $parameter["masterUserPassword"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Neptune cluster',
				action: 'Delete a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteDBCluster',
							Version: '2014-10-31',
							DBClusterIdentifier: '={{ $parameter["dbClusterIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a cluster',
				action: 'Describe a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeDBClusters',
							Version: '2014-10-31',
							DBClusterIdentifier: '={{ $parameter["dbClusterIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all Neptune clusters',
				action: 'List clusters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeDBClusters',
							Version: '2014-10-31',
						},
					},
				},
			},
			{
				name: 'Modify',
				value: 'modify',
				description: 'Modify a Neptune cluster',
				action: 'Modify a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ModifyDBCluster',
							Version: '2014-10-31',
							DBClusterIdentifier: '={{ $parameter["dbClusterIdentifier"] }}',
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
		displayName: 'DB Cluster Identifier',
		name: 'dbClusterIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'delete', 'describe', 'modify'],
			},
		},
		default: '',
		description: 'The cluster identifier',
	},
	{
		displayName: 'Master Username',
		name: 'masterUsername',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The master username for the cluster',
	},
	{
		displayName: 'Master User Password',
		name: 'masterUserPassword',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The master password for the cluster',
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
				displayName: 'Backup Retention Period',
				name: 'BackupRetentionPeriod',
				type: 'number',
				default: 1,
				description: 'Number of days to retain automated backups (1-35)',
			},
			{
				displayName: 'DB Cluster Parameter Group Name',
				name: 'DBClusterParameterGroupName',
				type: 'string',
				default: '',
				description: 'DB cluster parameter group to associate',
			},
			{
				displayName: 'DB Subnet Group Name',
				name: 'DBSubnetGroupName',
				type: 'string',
				default: '',
				description: 'DB subnet group to associate with this cluster',
			},
			{
				displayName: 'Engine Version',
				name: 'EngineVersion',
				type: 'options',
				options: [
					{ name: '1.3.0.0', value: '1.3.0.0' },
					{ name: '1.2.1.0', value: '1.2.1.0' },
					{ name: '1.2.0.2', value: '1.2.0.2' },
					{ name: '1.1.1.0', value: '1.1.1.0' },
				],
				default: '1.3.0.0',
				description: 'The Neptune engine version',
			},
			{
				displayName: 'Port',
				name: 'Port',
				type: 'number',
				default: 8182,
				description: 'Port number for the cluster (default: 8182 for Gremlin)',
			},
			{
				displayName: 'Preferred Backup Window',
				name: 'PreferredBackupWindow',
				type: 'string',
				default: '',
				description: 'Daily time range for automated backups (e.g., 03:00-04:00)',
			},
			{
				displayName: 'Storage Encrypted',
				name: 'StorageEncrypted',
				type: 'boolean',
				default: true,
				description: 'Whether to encrypt the cluster storage',
			},
			{
				displayName: 'VPC Security Group IDs',
				name: 'VpcSecurityGroupIds',
				type: 'string',
				default: '',
				description: 'Comma-separated list of VPC security group IDs',
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
				operation: ['modify'],
			},
		},
		options: [
			{
				displayName: 'Apply Immediately',
				name: 'ApplyImmediately',
				type: 'boolean',
				default: false,
				description: 'Whether to apply changes immediately',
			},
			{
				displayName: 'Backup Retention Period',
				name: 'BackupRetentionPeriod',
				type: 'number',
				default: 1,
				description: 'Number of days to retain automated backups',
			},
			{
				displayName: 'DB Cluster Parameter Group Name',
				name: 'DBClusterParameterGroupName',
				type: 'string',
				default: '',
				description: 'New cluster parameter group',
			},
			{
				displayName: 'Master User Password',
				name: 'MasterUserPassword',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'New master password',
			},
			{
				displayName: 'Preferred Backup Window',
				name: 'PreferredBackupWindow',
				type: 'string',
				default: '',
				description: 'Daily time range for automated backups',
			},
			{
				displayName: 'VPC Security Group IDs',
				name: 'VpcSecurityGroupIds',
				type: 'string',
				default: '',
				description: 'Comma-separated list of VPC security group IDs',
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
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Skip Final Snapshot',
				name: 'SkipFinalSnapshot',
				type: 'boolean',
				default: false,
				description: 'Whether to skip creating a final snapshot',
			},
			{
				displayName: 'Final DB Snapshot Identifier',
				name: 'FinalDBSnapshotIdentifier',
				type: 'string',
				default: '',
				description: 'Identifier for the final snapshot',
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

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
				description: 'Create a Redshift cluster',
				action: 'Create a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateCluster',
							Version: '2012-12-01',
							ClusterIdentifier: '={{ $parameter["clusterIdentifier"] }}',
							NodeType: '={{ $parameter["nodeType"] }}',
							MasterUsername: '={{ $parameter["masterUsername"] }}',
							MasterUserPassword: '={{ $parameter["masterUserPassword"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Redshift cluster',
				action: 'Delete a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteCluster',
							Version: '2012-12-01',
							ClusterIdentifier: '={{ $parameter["clusterIdentifier"] }}',
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
							Action: 'DescribeClusters',
							Version: '2012-12-01',
							ClusterIdentifier: '={{ $parameter["clusterIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all Redshift clusters',
				action: 'List clusters',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeClusters',
							Version: '2012-12-01',
						},
					},
				},
			},
			{
				name: 'Modify',
				value: 'modify',
				description: 'Modify a Redshift cluster',
				action: 'Modify a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ModifyCluster',
							Version: '2012-12-01',
							ClusterIdentifier: '={{ $parameter["clusterIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'Pause',
				value: 'pause',
				description: 'Pause a Redshift cluster',
				action: 'Pause a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'PauseCluster',
							Version: '2012-12-01',
							ClusterIdentifier: '={{ $parameter["clusterIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'Resume',
				value: 'resume',
				description: 'Resume a paused Redshift cluster',
				action: 'Resume a cluster',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ResumeCluster',
							Version: '2012-12-01',
							ClusterIdentifier: '={{ $parameter["clusterIdentifier"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const clusterFields: INodeProperties[] = [
	// Common fields
	{
		displayName: 'Cluster Identifier',
		name: 'clusterIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create', 'delete', 'describe', 'modify', 'pause', 'resume'],
			},
		},
		default: '',
		description: 'The unique identifier for the cluster',
	},
	// Create fields
	{
		displayName: 'Node Type',
		name: 'nodeType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['cluster'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'dc2.large', value: 'dc2.large' },
			{ name: 'dc2.8xlarge', value: 'dc2.8xlarge' },
			{ name: 'ra3.xlplus', value: 'ra3.xlplus' },
			{ name: 'ra3.4xlarge', value: 'ra3.4xlarge' },
			{ name: 'ra3.16xlarge', value: 'ra3.16xlarge' },
		],
		default: 'dc2.large',
		description: 'The node type for the cluster',
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
				displayName: 'Number of Nodes',
				name: 'NumberOfNodes',
				type: 'number',
				default: 1,
				description: 'Number of compute nodes in the cluster',
			},
			{
				displayName: 'Database Name',
				name: 'DBName',
				type: 'string',
				default: 'dev',
				description: 'Name of the first database to create',
			},
			{
				displayName: 'Cluster Type',
				name: 'ClusterType',
				type: 'options',
				options: [
					{ name: 'Single Node', value: 'single-node' },
					{ name: 'Multi Node', value: 'multi-node' },
				],
				default: 'single-node',
				description: 'The type of cluster',
			},
			{
				displayName: 'Port',
				name: 'Port',
				type: 'number',
				default: 5439,
				description: 'Port number for database connections',
			},
			{
				displayName: 'Publicly Accessible',
				name: 'PubliclyAccessible',
				type: 'boolean',
				default: false,
				description: 'Whether the cluster can be accessed from a public network',
			},
			{
				displayName: 'Encrypted',
				name: 'Encrypted',
				type: 'boolean',
				default: false,
				description: 'Whether data in the cluster is encrypted at rest',
			},
		],
	},
	// Modify fields
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
				displayName: 'Node Type',
				name: 'NodeType',
				type: 'string',
				default: '',
				description: 'New node type for the cluster',
			},
			{
				displayName: 'Number of Nodes',
				name: 'NumberOfNodes',
				type: 'number',
				default: 1,
				description: 'New number of nodes',
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
		],
	},
	// Delete fields
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
				name: 'SkipFinalClusterSnapshot',
				type: 'boolean',
				default: false,
				description: 'Whether to skip creating a final snapshot',
			},
			{
				displayName: 'Final Snapshot Identifier',
				name: 'FinalClusterSnapshotIdentifier',
				type: 'string',
				default: '',
				description: 'Identifier for the final snapshot',
			},
		],
	},
	// List fields
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

import type { INodeProperties } from 'n8n-workflow';

export const instanceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['instance'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a DocumentDB instance',
				action: 'Create an instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'CreateDBInstance',
							Version: '2014-10-31',
							DBInstanceIdentifier: '={{ $parameter["dbInstanceIdentifier"] }}',
							DBInstanceClass: '={{ $parameter["dbInstanceClass"] }}',
							Engine: 'docdb',
							DBClusterIdentifier: '={{ $parameter["dbClusterIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a DocumentDB instance',
				action: 'Delete an instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DeleteDBInstance',
							Version: '2014-10-31',
							DBInstanceIdentifier: '={{ $parameter["dbInstanceIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about an instance',
				action: 'Describe an instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeDBInstances',
							Version: '2014-10-31',
							DBInstanceIdentifier: '={{ $parameter["dbInstanceIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all DocumentDB instances',
				action: 'List instances',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'DescribeDBInstances',
							Version: '2014-10-31',
						},
					},
				},
			},
			{
				name: 'Modify',
				value: 'modify',
				description: 'Modify a DocumentDB instance',
				action: 'Modify an instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'ModifyDBInstance',
							Version: '2014-10-31',
							DBInstanceIdentifier: '={{ $parameter["dbInstanceIdentifier"] }}',
						},
					},
				},
			},
			{
				name: 'Reboot',
				value: 'reboot',
				description: 'Reboot a DocumentDB instance',
				action: 'Reboot an instance',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						qs: {
							Action: 'RebootDBInstance',
							Version: '2014-10-31',
							DBInstanceIdentifier: '={{ $parameter["dbInstanceIdentifier"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const instanceFields: INodeProperties[] = [
	{
		displayName: 'DB Instance Identifier',
		name: 'dbInstanceIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['create', 'delete', 'describe', 'modify', 'reboot'],
			},
		},
		default: '',
		description: 'The instance identifier',
	},
	{
		displayName: 'DB Instance Class',
		name: 'dbInstanceClass',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'db.t3.medium', value: 'db.t3.medium' },
			{ name: 'db.t4g.medium', value: 'db.t4g.medium' },
			{ name: 'db.r5.large', value: 'db.r5.large' },
			{ name: 'db.r5.xlarge', value: 'db.r5.xlarge' },
			{ name: 'db.r5.2xlarge', value: 'db.r5.2xlarge' },
			{ name: 'db.r6g.large', value: 'db.r6g.large' },
			{ name: 'db.r6g.xlarge', value: 'db.r6g.xlarge' },
		],
		default: 'db.r5.large',
		description: 'The compute and memory capacity of the instance',
	},
	{
		displayName: 'DB Cluster Identifier',
		name: 'dbClusterIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The identifier of the cluster this instance belongs to',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Auto Minor Version Upgrade',
				name: 'AutoMinorVersionUpgrade',
				type: 'boolean',
				default: true,
				description: 'Whether to enable automatic minor version upgrades',
			},
			{
				displayName: 'Availability Zone',
				name: 'AvailabilityZone',
				type: 'string',
				default: '',
				description: 'The availability zone for the instance',
			},
			{
				displayName: 'Engine Version',
				name: 'EngineVersion',
				type: 'options',
				options: [
					{ name: '5.0.0', value: '5.0.0' },
					{ name: '4.0.0', value: '4.0.0' },
					{ name: '3.6.0', value: '3.6.0' },
				],
				default: '5.0.0',
				description: 'The DocumentDB engine version',
			},
			{
				displayName: 'Preferred Maintenance Window',
				name: 'PreferredMaintenanceWindow',
				type: 'string',
				default: '',
				description: 'Weekly time range for maintenance (e.g., sun:05:00-sun:06:00)',
			},
			{
				displayName: 'Promotion Tier',
				name: 'PromotionTier',
				type: 'number',
				default: 1,
				description: 'Priority for promotion to primary (0-15)',
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
				resource: ['instance'],
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
				displayName: 'Auto Minor Version Upgrade',
				name: 'AutoMinorVersionUpgrade',
				type: 'boolean',
				default: true,
				description: 'Whether to enable automatic minor version upgrades',
			},
			{
				displayName: 'DB Instance Class',
				name: 'DBInstanceClass',
				type: 'options',
				options: [
					{ name: 'db.t3.medium', value: 'db.t3.medium' },
					{ name: 'db.t4g.medium', value: 'db.t4g.medium' },
					{ name: 'db.r5.large', value: 'db.r5.large' },
					{ name: 'db.r5.xlarge', value: 'db.r5.xlarge' },
					{ name: 'db.r5.2xlarge', value: 'db.r5.2xlarge' },
					{ name: 'db.r6g.large', value: 'db.r6g.large' },
					{ name: 'db.r6g.xlarge', value: 'db.r6g.xlarge' },
				],
				default: 'db.r5.large',
				description: 'The new instance class',
			},
			{
				displayName: 'Preferred Maintenance Window',
				name: 'PreferredMaintenanceWindow',
				type: 'string',
				default: '',
				description: 'Weekly time range for maintenance',
			},
			{
				displayName: 'Promotion Tier',
				name: 'PromotionTier',
				type: 'number',
				default: 1,
				description: 'Priority for promotion to primary (0-15)',
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
				resource: ['instance'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'DB Cluster Identifier',
				name: 'DBClusterIdentifier',
				type: 'string',
				default: '',
				description: 'Filter instances by cluster',
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
	{
		displayName: 'Force Failover',
		name: 'forceFailover',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['reboot'],
			},
		},
		description: 'Whether to force a failover during reboot',
	},
];

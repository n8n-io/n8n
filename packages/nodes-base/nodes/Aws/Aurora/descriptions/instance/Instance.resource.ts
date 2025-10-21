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
				description: 'Create a DB instance in a cluster',
				action: 'Create an instance',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'CreateDBInstance',
							Version: '2014-10-31',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a DB instance',
				action: 'Delete an instance',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DeleteDBInstance',
							Version: '2014-10-31',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get instance details',
				action: 'Get an instance',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DescribeDBInstances',
							Version: '2014-10-31',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List DB instances',
				action: 'Get many instances',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'DescribeDBInstances',
							Version: '2014-10-31',
						},
					},
				},
			},
			{
				name: 'Reboot',
				value: 'reboot',
				description: 'Reboot a DB instance',
				action: 'Reboot an instance',
				routing: {
					request: {
						method: 'POST',
						qs: {
							Action: 'RebootDBInstance',
							Version: '2014-10-31',
						},
					},
				},
			},
		],
		default: 'create',
	},
];

export const instanceFields: INodeProperties[] = [
	{
		displayName: 'DB Instance Identifier',
		name: 'DBInstanceIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['instance'],
			},
		},
		default: '',
		routing: {
			request: {
				qs: {
					DBInstanceIdentifier: '={{ $value }}',
				},
			},
		},
		description: 'The DB instance identifier',
	},
	{
		displayName: 'DB Instance Class',
		name: 'DBInstanceClass',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['create'],
			},
		},
		default: 'db.r5.large',
		routing: {
			request: {
				qs: {
					DBInstanceClass: '={{ $value }}',
				},
			},
		},
		description: 'The compute and memory capacity (e.g., db.r5.large)',
	},
	{
		displayName: 'Engine',
		name: 'Engine',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['instance'],
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
		],
		default: 'aurora-mysql',
		routing: {
			request: {
				qs: {
					Engine: '={{ $value }}',
				},
			},
		},
		description: 'The database engine',
	},
	{
		displayName: 'DB Cluster Identifier',
		name: 'DBClusterIdentifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				qs: {
					DBClusterIdentifier: '={{ $value }}',
				},
			},
		},
		description: 'The cluster this instance belongs to',
	},
	{
		displayName: 'Publicly Accessible',
		name: 'PubliclyAccessible',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['create'],
			},
		},
		default: false,
		routing: {
			request: {
				qs: {
					PubliclyAccessible: '={{ $value }}',
				},
			},
		},
		description: 'Whether the instance is publicly accessible',
	},
	{
		displayName: 'Skip Final Snapshot',
		name: 'SkipFinalSnapshot',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['instance'],
				operation: ['delete'],
			},
		},
		default: false,
		routing: {
			request: {
				qs: {
					SkipFinalSnapshot: '={{ $value }}',
				},
			},
		},
		description: 'Whether to skip creating a final snapshot',
	},
];

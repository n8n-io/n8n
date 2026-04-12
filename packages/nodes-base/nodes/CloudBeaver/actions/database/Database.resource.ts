import type { INodeProperties } from 'n8n-workflow';

import * as executeQuery from './executeQuery.operation';

export { executeQuery };

export const description: INodeProperties[] = [
	{
		displayName: 'Only connections from the Shared project are supported.',
		name: 'sharedProjectNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Connection ID',
		name: 'connectionId',
		type: 'string',
		default: '',
		required: true,
		description:
			'Use the database connection ID in CloudBeaver. Right-click the database in Database Navigator, select Open, and check the ID in the window.',
		placeholder: 'e.g. postgres-jdbc-19d5ca3a223-2f46e1a321049b15',
	},
	{
		displayName: 'SQL Query',
		name: 'query',
		type: 'string',
		typeOptions: { editor: 'sqlEditor' },
		default: '',
		required: true,
		description: 'SQL query to execute',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 100,
		placeholder: 'e.g. 100',
		description: 'Max number of results to return',
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		placeholder: 'e.g. 50',
		description: 'Number of results to skip before returning rows',
	},
	{
		displayName: 'Order By',
		name: 'orderBy',
		type: 'string',
		default: '',
		placeholder: 'e.g. name ASC, created_at DESC',
		description: 'Column(s) to sort results by, applied on top of the SQL query',
	},
	{
		displayName: 'Where',
		name: 'where',
		type: 'string',
		default: '',
		placeholder: "e.g. age > 18 AND status = 'active'",
		description: 'Additional WHERE condition applied on top of the SQL query',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Query Timeout',
				name: 'queryTimeout',
				type: 'number',
				default: 60,
				typeOptions: { minValue: 1 },
				description: 'Max number of seconds to wait for query results',
			},
			{
				displayName: 'Replace Empty Strings with NULL',
				name: 'replaceEmptyStrings',
				type: 'boolean',
				default: false,
				description: 'Whether to replace empty strings with NULL in the query results',
			},
		],
	},
];

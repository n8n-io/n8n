import type { INodeProperties } from 'n8n-workflow';

export const tableOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['table'],
			},
		},
		options: [
			{
				name: 'Create Row',
				value: 'createRow',
				description: 'Create/Insert a row',
				action: 'Create a row',
			},
			{
				name: 'Delete Row',
				value: 'deleteRow',
				description: 'Delete one or multiple rows',
				action: 'Delete a row',
			},
			{
				name: 'Get All Columns',
				value: 'getAllColumns',
				action: 'Get all columns',
			},
			{
				name: 'Get All Rows',
				value: 'getAllRows',
				description: 'Get all the rows',
				action: 'Get all rows',
			},
			{
				name: 'Get Column',
				value: 'getColumn',
				description: 'Get a column',
				action: 'Get a column',
			},
			{
				name: 'Get Row',
				value: 'getRow',
				description: 'Get a row',
				action: 'Get a row',
			},
			{
				name: 'Push Button',
				value: 'pushButton',
				description: 'Pushes a button',
				action: 'Push a button',
			},
		],
		default: 'createRow',
	},
];

export const tableFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                table:createRow                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['createRow'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getTables',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['createRow'],
			},
		},
		description:
			'The table to create the row in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['createRow'],
			},
		},
		options: [
			{
				displayName: 'Disable Parsing',
				name: 'disableParsing',
				type: 'boolean',
				default: false,
				description: 'Whether the API will not attempt to parse the data in any way',
			},
			{
				displayName: 'Key Columns',
				name: 'keyColumns',
				type: 'string',
				default: '',
				description:
					'Optional column IDs, URLs, or names (fragile and discouraged), specifying columns to be used as upsert keys. If more than one separate by a comma (,).',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   table:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getRow'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getTables',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getRow'],
			},
		},
		description:
			'The table to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getRow'],
			},
		},
		description:
			"ID or name of the row. Names are discouraged because they're easily prone to being changed by users. If you're using a name, be sure to URI-encode it. If there are multiple rows with the same value in the identifying column, an arbitrary one will be selected",
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getRow'],
			},
		},
		options: [
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: false,
				description: 'Whether to return the data exactly in the way it got received from the API',
			},
			{
				displayName: 'Use Column Names',
				name: 'useColumnNames',
				type: 'boolean',
				default: false,
				description:
					'Whether to use column names instead of column IDs in the returned output. This is generally discouraged as it is fragile. If columns are renamed, code using original names may throw errors.',
			},
			{
				displayName: 'ValueFormat',
				name: 'valueFormat',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Simple',
						value: 'simple',
					},
					{
						name: 'Simple With Arrays',
						value: 'simpleWithArrays',
					},
					{
						name: 'Rich',
						value: 'rich',
					},
				],
				description: 'The format that cell values are returned as',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   table:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllRows'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getTables',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllRows'],
			},
		},
		description:
			'The table to get the rows from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllRows'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllRows'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllRows'],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description:
					'Query used to filter returned rows, specified as &lt;column_id_or_name&gt;:&lt;value&gt;. If you\'d like to use a column name instead of an ID, you must quote it (e.g., "My Column":123). Also note that value is a JSON value; if you\'d like to use a string, you must surround it in quotes (e.g., "groceries").',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: false,
				description: 'Whether to return the data exactly in the way it got received from the API',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Created At',
						value: 'createdAt',
					},
					{
						name: 'Natural',
						value: 'natural',
					},
				],
				description:
					'Specifies the sort order of the rows returned. If left unspecified, rows are returned by creation time ascending.',
			},
			{
				displayName: 'Use Column Names',
				name: 'useColumnNames',
				type: 'boolean',
				default: false,
				description:
					'Whether to use column names instead of column IDs in the returned output. This is generally discouraged as it is fragile. If columns are renamed, code using original names may throw errors.',
			},
			{
				displayName: 'ValueFormat',
				name: 'valueFormat',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Simple',
						value: 'simple',
					},
					{
						name: 'Simple With Arrays',
						value: 'simpleWithArrays',
					},
					{
						name: 'Rich',
						value: 'rich',
					},
				],
				description: 'The format that cell values are returned as',
			},
			{
				displayName: 'Visible Only',
				name: 'visibleOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to return only visible rows and columns for the table',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 row:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['deleteRow'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getTables',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['deleteRow'],
			},
		},
		description:
			'The table to delete the row in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['deleteRow'],
			},
		},
		description: 'Row IDs to delete',
	},
	/* -------------------------------------------------------------------------- */
	/*                                   table:pushButton                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['pushButton'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getTables',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['pushButton'],
			},
		},
		description:
			'The table to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['pushButton'],
			},
		},
		description:
			"ID or name of the row. Names are discouraged because they're easily prone to being changed by users. If you're using a name, be sure to URI-encode it. If there are multiple rows with the same value in the identifying column, an arbitrary one will be selected",
	},
	{
		displayName: 'Column Name or ID',
		name: 'columnId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['docId', 'tableId'],
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['pushButton'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                   table:getColumn                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getColumn'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getTables',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getColumn'],
			},
		},
		description:
			'The table to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Column ID',
		name: 'columnId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getColumn'],
			},
		},
		description: 'The table to get the row from',
	},
	/* -------------------------------------------------------------------------- */
	/*                                   table:getAllColumns                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc Name or ID',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllColumns'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getTables',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllColumns'],
			},
		},
		description:
			'The table to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllColumns'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['getAllColumns'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];

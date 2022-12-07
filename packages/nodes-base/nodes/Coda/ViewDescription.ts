import { INodeProperties } from 'n8n-workflow';

export const viewOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['view'],
			},
		},
		options: [
			{
				name: 'Delete Row',
				value: 'deleteViewRow',
				description: 'Delete view row',
				action: 'Delete a view row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a view',
				action: 'Get a view',
			},
			{
				name: 'Get Columns',
				value: 'getAllViewColumns',
				description: 'Get all views columns',
				action: 'Get all view columns',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many views',
				action: 'Get many views',
			},
			{
				name: 'Get Rows',
				value: 'getAllViewRows',
				description: 'Get all views rows',
				action: 'Get a view row',
			},
			{
				name: 'Push Button',
				value: 'pushViewButton',
				description: 'Push view button',
				action: 'Push a view button',
			},
			{
				name: 'Update Row',
				value: 'updateViewRow',
				action: 'Update a view row',
			},
		],
		default: 'get',
	},
];

export const viewFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                   view:get                                 */
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
				resource: ['view'],
				operation: ['get'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'View ID',
		name: 'viewId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['get'],
			},
		},
		description: 'The view to get the row from',
	},
	/* -------------------------------------------------------------------------- */
	/*                                   view:getAll                              */
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
				resource: ['view'],
				operation: ['getAll'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['getAll'],
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
				resource: ['view'],
				operation: ['getAll'],
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
	/* -------------------------------------------------------------------------- */
	/*                                   view:getAllViewRows                      */
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
				resource: ['view'],
				operation: ['getAllViewRows'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'View Name or ID',
		name: 'viewId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getViews',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['getAllViewRows'],
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
				resource: ['view'],
				operation: ['getAllViewRows'],
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
				resource: ['view'],
				operation: ['getAllViewRows'],
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
				resource: ['view'],
				operation: ['getAllViewRows'],
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
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   view:getAllViewColumns                   */
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
				resource: ['view'],
				operation: ['getAllViewColumns'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'View Name or ID',
		name: 'viewId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['docId'],
			loadOptionsMethod: 'getViews',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['getAllViewColumns'],
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
				resource: ['view'],
				operation: ['getAllViewColumns'],
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
				resource: ['view'],
				operation: ['getAllViewColumns'],
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
	/* -------------------------------------------------------------------------- */
	/*                                   view:deleteViewRow                       */
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
				resource: ['view'],
				operation: ['deleteViewRow'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'View Name or ID',
		name: 'viewId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViews',
			loadOptionsDependsOn: ['docId'],
		},
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['deleteViewRow'],
			},
		},
		description:
			'The view to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Row Name or ID',
		name: 'rowId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViewRows',
			loadOptionsDependsOn: ['viewId'],
		},
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['deleteViewRow'],
			},
		},
		description:
			'The view to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                   view:pushViewButton                      */
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
				resource: ['view'],
				operation: ['pushViewButton'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'View Name or ID',
		name: 'viewId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViews',
			loadOptionsDependsOn: ['docId'],
		},
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['pushViewButton'],
			},
		},
		description:
			'The view to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Row Name or ID',
		name: 'rowId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViewRows',
			loadOptionsDependsOn: ['viewId'],
		},
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['pushViewButton'],
			},
		},
		description:
			'The view to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Column Name or ID',
		name: 'columnId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getViewColumns',
			loadOptionsDependsOn: ['docId', 'viewId'],
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['pushViewButton'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                   view:updateViewRow                       */
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
				resource: ['view'],
				operation: ['updateViewRow'],
			},
		},
		description:
			'ID of the doc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'View Name or ID',
		name: 'viewId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViews',
			loadOptionsDependsOn: ['docId'],
		},
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['updateViewRow'],
			},
		},
		description:
			'The view to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Row Name or ID',
		name: 'rowId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViewRows',
			loadOptionsDependsOn: ['viewId'],
		},
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['updateViewRow'],
			},
		},
		description:
			'The view to get the row from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Key Name',
		name: 'keyName',
		type: 'string',
		required: true,
		default: 'columns',
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['updateViewRow'],
			},
		},
		description: 'The view to get the row from',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['view'],
				operation: ['updateViewRow'],
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
		],
	},
];

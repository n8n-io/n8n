import { INodeProperties } from 'n8n-workflow';

export const viewOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
			},
		},
		options: [
			{
				name: 'Delete Row',
				value: 'deleteViewRow',
				description: 'Delete view row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a view',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all views',
			},
			{
				name: 'Get Columns',
				value: 'getAllViewColumns',
				description: 'Get all views columns',
			},
			{
				name: 'Get Rows',
				value: 'getAllViewRows',
				description: 'Get all views rows',
			},
			{
				name: 'Update Row',
				value: 'updateViewRow',
				description: 'Update row',
			},
			{
				name: 'Push Button',
				value: 'pushViewButton',
				description: 'Push view button',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const viewFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                   view:get                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'View ID',
		name: 'viewId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'The view to get the row from.',
	},
/* -------------------------------------------------------------------------- */
/*                                   view:getAll                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
/* -------------------------------------------------------------------------- */
/*                                   view:getAllViewRows                      */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewRows',
				],
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'View',
		name: 'viewId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'docId',
			],
			loadOptionsMethod: 'getViews',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewRows',
				],
			},
		},
		description: 'The table to get the rows from.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewRows',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewRows',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewRows',
				],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: `Query used to filter returned rows, specified as &lt;column_id_or_name&gt;:&lt;value&gt;. If you'd like to use a column name instead of an ID, you must quote it (e.g., "My Column":123). Also note that value is a JSON value; if you'd like to use a string, you must surround it in quotes (e.g., "groceries").`,
			},
			{
				displayName: 'Use Column Names',
				name: 'useColumnNames',
				type: 'boolean',
				default: false,
				description: `Use column names instead of column IDs in the returned output. This is generally discouraged as it is fragile. If columns are renamed, code using original names may throw errors.`,
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
				description: `The format that cell values are returned as.`,
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: false,
				description: `Returns the data exactly in the way it got received from the API.`,
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
				description: `Specifies the sort order of the rows returned. If left unspecified, rows are returned by creation time ascending.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                   view:getAllViewColumns                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewColumns',
				],
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'View',
		name: 'viewId',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'docId',
			],
			loadOptionsMethod: 'getViews',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewColumns',
				],
			},
		},
		description: 'The table to get the rows from.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewColumns',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'getAllViewColumns',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
/* -------------------------------------------------------------------------- */
/*                                   view:deleteViewRow                       */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'deleteViewRow',
				],
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'View',
		name: 'viewId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViews',
			loadOptionsDependsOn: [
				'docId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'deleteViewRow',
				],
			},
		},
		description: 'The view to get the row from.',
	},
	{
		displayName: 'Row',
		name: 'rowId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViewRows',
			loadOptionsDependsOn: [
				'viewId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'deleteViewRow',
				],
			},
		},
		description: 'The view to get the row from.',
	},
/* -------------------------------------------------------------------------- */
/*                                   view:pushViewButton                      */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'pushViewButton',
				],
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'View',
		name: 'viewId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViews',
			loadOptionsDependsOn: [
				'docId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'pushViewButton',
				],
			},
		},
		description: 'The view to get the row from.',
	},
	{
		displayName: 'Row',
		name: 'rowId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViewRows',
			loadOptionsDependsOn: [
				'viewId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'pushViewButton',
				],
			},
		},
		description: 'The view to get the row from.',
	},
	{
		displayName: 'Column',
		name: 'columnId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getViewColumns',
			loadOptionsDependsOn: [
				'docId',
				'viewId',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'pushViewButton',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                   view:updateViewRow                       */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'updateViewRow',
				],
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'View',
		name: 'viewId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViews',
			loadOptionsDependsOn: [
				'docId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'updateViewRow',
				],
			},
		},
		description: 'The view to get the row from.',
	},
	{
		displayName: 'Row',
		name: 'rowId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getViewRows',
			loadOptionsDependsOn: [
				'viewId',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'updateViewRow',
				],
			},
		},
		description: 'The view to get the row from.',
	},
	{
		displayName: 'Key Name',
		name: 'keyName',
		type: 'string',
		required: true,
		default: 'columns',
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'updateViewRow',
				],
			},
		},
		description: 'The view to get the row from.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'view',
				],
				operation: [
					'updateViewRow',
				],
			},
		},
		options: [
			{
				displayName: 'Disable Parsing',
				name: 'disableParsing',
				type: 'boolean',
				default: false,
				description: `If true, the API will not attempt to parse the data in any way.`,
			},
		],
	},
];

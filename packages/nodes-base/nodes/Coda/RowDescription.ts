import { INodeProperties } from "n8n-workflow";

export const rowOpeations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'row',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create/Upsert a row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get row',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the rows',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete one or multiple rows',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const rowFields = [

/* -------------------------------------------------------------------------- */
/*                                row:create                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create'
				]
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create'
				]
			},
		},
		description: `ID or name of the table. Names are discouraged because</br>
		they're easily prone to being changed by users.</br>
		If you're using a name, be sure to URI-encode it.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Key Columns',
				name: 'keyColumns',
				type: 'string',
				default: '',
				description: `Optional column IDs, URLs, or names (fragile and discouraged),
				specifying columns to be used as upsert keys. If more than one separate by ,`,
			},
			{
				displayName: 'Disable Parsing',
				name: 'disableParsing',
				type: 'boolean',
				default: false,
				description: `If true, the API will not attempt to parse the data in any way.`,
			},
		]
	},

/* -------------------------------------------------------------------------- */
/*                                   row:get                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'get'
				]
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'get'
				]
			},
		},
		description: `ID or name of the table. Names are discouraged because</br>
		they're easily prone to being changed by users.</br>
		If you're using a name, be sure to URI-encode it.`,
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'get'
				]
			},
		},
		description: `ID or name of the row. Names are discouraged because they're easily prone to being changed by users.
		If you're using a name, be sure to URI-encode it.
		If there are multiple rows with the same value in the identifying column, an arbitrary one will be selected`,
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Use Column Names',
				name: 'useColumnNames',
				type: 'boolean',
				default: false,
				description: `Use column names instead of column IDs in the returned output.</br>
				This is generally discouraged as it is fragile. If columns are renamed,</br>
				code using original names may throw errors.`,
			},
			{
				displayName: 'ValueFormat',
				name: 'valueFormat',
				type: 'options',
				default: [],
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
		]
	},
/* -------------------------------------------------------------------------- */
/*                                   get:all                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'getAll'
				]
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'getAll'
				]
			},
		},
		description: `ID or name of the table. Names are discouraged because</br>
		they're easily prone to being changed by users.</br>
		If you're using a name, be sure to URI-encode it.`,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'getAll'
				]
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
					'row',
				],
				operation: [
					'getAll'
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Use Column Names',
				name: 'useColumnNames',
				type: 'boolean',
				default: false,
				description: `Use column names instead of column IDs in the returned output.</br>
				This is generally discouraged as it is fragile. If columns are renamed,</br>
				code using original names may throw errors.`,
			},
			{
				displayName: 'ValueFormat',
				name: 'valueFormat',
				type: 'options',
				default: [],
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
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: [],
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
				description: `Specifies the sort order of the rows returned.
				If left unspecified, rows are returned by creation time ascending.`,
			},
			{
				displayName: 'Visible Only',
				name: 'visibleOnly',
				type: 'boolean',
				default: false,
				description: `If true, returns only visible rows and columns for the table.`,
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                 row:delete                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc',
		name: 'docId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocs',
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'delete'
				]
			},
		},
		description: 'ID of the doc.',
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		required: true,
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'delete'
				]
			},
		},
		description: `ID or name of the table. Names are discouraged because</br>
		they're easily prone to being changed by users.</br>
		If you're using a name, be sure to URI-encode it.`,
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'delete'
				]
			},
		},
		description: `Row IDs to delete separated by ,.`,
	},

] as INodeProperties[];

import type { INodeProperties } from 'n8n-workflow';

export const operationFields: INodeProperties[] = [
	// ----------------------------------
	//             shared
	// ----------------------------------
	{
		displayName: 'Database Name or ID',
		name: 'databaseId',
		type: 'options',
		default: '',
		required: true,
		description:
			'Database to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getDatabaseIds',
		},
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		default: '',
		required: true,
		description:
			'Table to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsDependsOn: ['databaseId'],
			loadOptionsMethod: 'getTableIds',
		},
	},

	// ----------------------------------
	//               get
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to return',
	},

	// ----------------------------------
	//              update
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to update',
	},

	// ----------------------------------
	//             create/update
	// ----------------------------------
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				operation: ['create', 'update'],
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				dataToSend: ['autoMapInputData'],
			},
		},
		default: '',
		description:
			'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Field to Send',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				dataToSend: ['defineBelow'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['tableId'],
							loadOptionsMethod: 'getTableFields',
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},

	// ----------------------------------
	//             delete
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete'],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to delete',
	},

	// ----------------------------------
	//            getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Filters',
				name: 'filters',
				placeholder: 'Add Filter',
				description: 'Filter rows based on comparison operators',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								default: '',
								description:
									'Field to compare. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
								typeOptions: {
									loadOptionsDependsOn: ['tableId'],
									loadOptionsMethod: 'getTableFields',
								},
							},
							{
								displayName: 'Filter',
								name: 'operator',
								description: 'Operator to compare field and value with',
								type: 'options',
								options: [
									{
										name: 'Contains',
										value: 'contains',
										description: 'Field contains value',
									},
									{
										name: 'Contains Not',
										value: 'contains_not',
										description: 'Field does not contain value',
									},
									{
										name: 'Date After Date',
										value: 'date_after',
										description: "Field after this date. Format: 'YYYY-MM-DD'.",
									},
									{
										name: 'Date Before Date',
										value: 'date_before',
										description: "Field before this date. Format: 'YYYY-MM-DD'.",
									},
									{
										name: 'Date Equal',
										value: 'date_equal',
										description: "Field is date. Format: 'YYYY-MM-DD'.",
									},
									{
										name: 'Date Equals Month',
										value: 'date_equals_month',
										description: 'Field in this month. Format: string.',
									},
									{
										name: 'Date Equals Today',
										value: 'date_equals_today',
										description: 'Field is today. Format: string.',
									},
									{
										name: 'Date Equals Year',
										value: 'date_equals_year',
										description: 'Field in this year. Format: string.',
									},
									{
										name: 'Date Not Equal',
										value: 'date_not_equal',
										description: "Field is not date. Format: 'YYYY-MM-DD'.",
									},
									{
										name: 'Equal',
										value: 'equal',
										description: 'Field is equal to value',
									},
									{
										name: 'Filename Contains',
										value: 'filename_contains',
										description: 'Field filename contains value',
									},
									{
										name: 'Higher Than',
										value: 'higher_than',
										description: 'Field is higher than value',
									},
									{
										name: 'Is Empty',
										value: 'empty',
										description: 'Field is empty',
									},
									{
										name: 'Is Not Empty',
										value: 'not_empty',
										description: 'Field is not empty',
									},
									{
										name: 'Is True',
										value: 'boolean',
										description: 'Boolean field is true',
									},
									{
										name: 'Link Row Does Not Have',
										value: 'link_row_has_not',
										description: 'Field does not have link ID',
									},
									{
										name: 'Link Row Has',
										value: 'link_row_has',
										description: 'Field has link ID',
									},
									{
										name: 'Lower Than',
										value: 'lower_than',
										description: 'Field is lower than value',
									},
									{
										name: 'Not Equal',
										value: 'not_equal',
										description: 'Field is not equal to value',
									},
									{
										name: 'Single Select Equal',
										value: 'single_select_equal',
										description: 'Field selected option is value',
									},
									{
										name: 'Single Select Not Equal',
										value: 'single_select_not_equal',
										description: 'Field selected option is not value',
									},
								],
								default: 'equal',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to compare to',
							},
						],
					},
				],
			},
			{
				displayName: 'Filter Type',
				name: 'filterType',
				type: 'options',
				options: [
					{
						name: 'AND',
						value: 'AND',
						description: 'Indicates that the rows must match all the provided filters',
					},
					{
						name: 'OR',
						value: 'OR',
						description: 'Indicates that the rows only have to match one of the filters',
					},
				],
				default: 'AND',
				description:
					'This works only if two or more filters are provided. Defaults to <code>AND</code>',
			},
			{
				displayName: 'Search Term',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to match (can be in any column)',
			},
			{
				displayName: 'Sorting',
				name: 'order',
				placeholder: 'Add Sort Order',
				description: 'Set the sort order of the result rows',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								default: '',
								description:
									'Field name to sort by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
								typeOptions: {
									loadOptionsDependsOn: ['tableId'],
									loadOptionsMethod: 'getTableFields',
								},
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{
										name: 'ASC',
										value: '',
										description: 'Sort in ascending order',
									},
									{
										name: 'DESC',
										value: '-',
										description: 'Sort in descending order',
									},
								],
								default: '',
								description: 'Sort direction, either ascending or descending',
							},
						],
					},
				],
			},
		],
	},
];

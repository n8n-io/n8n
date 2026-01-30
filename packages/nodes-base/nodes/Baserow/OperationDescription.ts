import type { INodeProperties } from 'n8n-workflow';

export const operationFields: INodeProperties[] = [
	// ----------------------------------
	//             shared
	// ----------------------------------
	{
		displayName: 'Database Name or ID',
		name: 'databaseId',
		type: 'options',
		default: '0',
		required: true,
		description:
			'Database to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
			'Table to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				operation: ['create', 'update', 'batchCreate', 'batchUpdate'],
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
				operation: ['create', 'update', 'batchCreate', 'batchUpdate'],
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
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
	{
		displayName: 'Rows',
		name: 'rowsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Row',
		displayOptions: {
			show: {
				operation: ['batchCreate', 'batchUpdate'],
				dataToSend: ['defineBelow'],
			},
		},
		default: [],
		options: [
			{
				name: 'rowValues',
				displayName: 'Row',
				values: [
					{
						displayName: 'Row ID',
						name: 'id',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['batchUpdate'],
							},
						},
						default: '',
						required: true,
						description: 'Row ID to update (required for batch update)',
					},
					{
						displayName: 'Fields',
						name: 'fieldsUi',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Field',
						},
						default: {},
						options: [
							{
								name: 'fieldValues',
								displayName: 'Field',
								values: [
									{
										displayName: 'Field Name or ID',
										name: 'fieldId',
										type: 'options',
										description:
											'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
				],
			},
		],
	},

	// ----------------------------------
	//             delete
	// ----------------------------------
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data',
				value: 'autoMapInputData',
				description: 'Collect row IDs from input items automatically',
			},
			{
				name: 'Define Below',
				value: 'defineBelow',
				description: 'Manually specify row IDs',
			},
		],
		displayOptions: {
			show: {
				operation: ['batchDelete'],
			},
		},
		default: 'defineBelow',
		description: 'Choose whether to manually enter row IDs or map them from input data',
	},
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
	{
		displayName: 'Row IDs',
		name: 'rowIds',
		type: 'string',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		placeholder: 'Add Row ID',
		displayOptions: {
			show: {
				operation: ['batchDelete'],
				dataToSend: ['defineBelow'],
			},
		},
		description: 'IDs of the rows to delete',
	},
	{
		displayName: 'Property Containing Row ID',
		name: 'rowIdProperty',
		type: 'string',
		default: 'id',
		displayOptions: {
			show: {
				operation: ['batchDelete'],
				dataToSend: ['autoMapInputData'],
			},
		},
		description: 'Name of the property in each input item that contains the row ID',
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
		placeholder: 'Add option',
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
									'Field to compare. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
								/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
								options: [
									{
										name: 'Equal',
										value: 'equal',
										description: 'Field value is exactly equal to the given value',
									},
									{
										name: 'Not Equal',
										value: 'not_equal',
										description: 'Field value is not equal to the given value',
									},
									{
										name: 'Contains',
										value: 'contains',
										description: 'Field value contains the given substring (case-insensitive)',
									},
									{
										name: 'Contains Not',
										value: 'contains_not',
										description:
											'Field value does not contain the given substring (case-insensitive)',
									},
									{
										name: 'Contains Word',
										value: 'contains_word',
										description:
											'Field contains the full word (case-insensitive match on word boundaries)',
									},
									{
										name: 'Does Not Contain Word',
										value: 'doesnt_contain_word',
										description: 'Field does not contain the full word (case-insensitive)',
									},
									{
										name: 'Length Is Lower Than',
										value: 'length_is_lower_than',
										description: 'Field value length is shorter than the given number',
									},
									{
										name: 'Higher Than',
										value: 'higher_than',
										description: 'Field value is greater than the given number',
									},
									{
										name: 'Higher Than or Equal',
										value: 'higher_than_or_equal',
										description: 'Field value is greater than or equal to the given number',
									},
									{
										name: 'Lower Than',
										value: 'lower_than',
										description: 'Field value is less than the given number',
									},
									{
										name: 'Lower Than or Equal',
										value: 'lower_than_or_equal',
										description: 'Field value is less than or equal to the given number',
									},
									{
										name: 'Is Even And Whole',
										value: 'is_even_and_whole',
										description: 'Field value is an even whole number (no decimals)',
									},
									{
										name: 'Date Is',
										value: 'date_is',
										description:
											'Date matches the given day. Format: `Europe/Berlin??2024-09-17` (Timezone??YYYY-MM-DD).',
									},
									{
										name: 'Date Is Not',
										value: 'date_is_not',
										description: 'Date does not match the given day. Format: `UTC??2024-09-17`.',
									},
									{
										name: 'Date Is Before',
										value: 'date_is_before',
										description:
											'Date is strictly before the given day. Format: `UTC??2024-09-17`.',
									},
									{
										name: 'Date Is On Or Before',
										value: 'date_is_on_or_before',
										description:
											'Date is before or equal to the given day. Format: `UTC??2024-09-17`.',
									},
									{
										name: 'Date Is After',
										value: 'date_is_after',
										description: 'Date is strictly after the given day. Format: `UTC??2024-09-17`.',
									},
									{
										name: 'Date Is On Or After',
										value: 'date_is_on_or_after',
										description:
											'Date is after or equal to the given day. Format: `UTC??2024-09-17`.',
									},
									{
										name: 'Date Is Within',
										value: 'date_is_within',
										description:
											'Date is within the next X days. Format: `UTC??30` (Timezone??NumberOfDays).',
									},
									{
										name: 'Date Equals Today',
										value: 'date_equals_today',
										description:
											'Date is today. Format: `UTC??today`. (Deprecated but kept for compatibility).',
									},
									{
										name: 'Date Equals Month',
										value: 'date_equals_month',
										description:
											'Date is in the given month. Format: `UTC??2024-09`. (Deprecated but kept for compatibility).',
									},
									{
										name: 'Date Equals Year',
										value: 'date_equals_year',
										description:
											'Date is in the given year. Format: `UTC??2024`. (Deprecated but kept for compatibility).',
									},
									{
										name: 'Date Equals Day Of Month',
										value: 'date_equals_day_of_month',
										description: 'Day of month matches the given number. Format: `UTC??15` (1-31).',
									},
									{
										name: 'Date Equal (Deprecated)',
										value: 'date_equal',
										description:
											'Field is date. Format: `UTC?YYYY-MM-DD`. Prefer using Date Is (date_is).',
									},
									{
										name: 'Date Not Equal (Deprecated)',
										value: 'date_not_equal',
										description:
											'Field is not date. Format: `UTC?YYYY-MM-DD`. Prefer using Date Is Not (date_is_not).',
									},
									{
										name: 'Date Before (Deprecated)',
										value: 'date_before',
										description:
											'Field before this date. Format: `UTC?YYYY-MM-DD`. Prefer using Date Is Before (date_is_before).',
									},
									{
										name: 'Date Before Or Equal (Deprecated)',
										value: 'date_before_or_equal',
										description:
											'Field on or before this date. Format: `UTC?YYYY-MM-DD`. Prefer using Date Is On Or Before (date_is_on_or_before).',
									},
									{
										name: 'Date After (Deprecated)',
										value: 'date_after',
										description:
											'Field after this date. Format: `UTC?YYYY-MM-DD`. Prefer using Date Is After (date_is_after).',
									},
									{
										name: 'Date After Or Equal (Deprecated)',
										value: 'date_after_or_equal',
										description:
											'Field after or equal to this date. Format: `UTC?YYYY-MM-DD`. Prefer using Date Is On Or After (date_is_on_or_after).',
									},
									{
										name: 'Date After Days Ago (Deprecated)',
										value: 'date_after_days_ago',
										description:
											'Date is after X days ago. Format: `UTC?10`. Prefer using Date Is On Or After with NR_DAYS_AGO.',
									},
									{
										name: 'Date Within Days (Deprecated)',
										value: 'date_within_days',
										description:
											'Date is within N days from today. Format: `UTC?30`. Prefer using Date Is Within (date_is_within).',
									},
									{
										name: 'Date Within Weeks (Deprecated)',
										value: 'date_within_weeks',
										description:
											'Date is within N weeks from today. Format: `UTC?4`. Prefer using Date Is Within.',
									},
									{
										name: 'Date Within Months (Deprecated)',
										value: 'date_within_months',
										description:
											'Date is within N months from today. Format: `UTC?3`. Prefer using Date Is Within.',
									},
									{
										name: 'Date Equals Days Ago (Deprecated)',
										value: 'date_equals_days_ago',
										description: 'Date is exactly N days ago. Format: `UTC?5`.',
									},
									{
										name: 'Date Equals Months Ago (Deprecated)',
										value: 'date_equals_months_ago',
										description: 'Date is exactly N months ago. Format: `UTC?2`.',
									},
									{
										name: 'Date Equals Years Ago (Deprecated)',
										value: 'date_equals_years_ago',
										description: 'Date is exactly N years ago. Format: `UTC?1`.',
									},
									{
										name: 'Date Before Today (Deprecated)',
										value: 'date_before_today',
										description:
											'Date is before today. Format: `UTC`. Prefer using Date Is Before with operator TODAY.',
									},
									{
										name: 'Date After Today (Deprecated)',
										value: 'date_after_today',
										description:
											'Date is after today. Format: `UTC`. Prefer using Date Is After with operator TODAY.',
									},
									{
										name: 'Date Equals Current Week (Deprecated)',
										value: 'date_equals_week',
										description:
											'Date is within current week. Format: `UTC`. Prefer using Date Is with THIS_WEEK.',
									},
									{
										name: 'Filename Contains',
										value: 'filename_contains',
										description: 'Filename contains the given substring',
									},
									{
										name: 'Has File Type',
										value: 'has_file_type',
										description: 'File type is "image" or "document"',
									},
									{
										name: 'Files Lower Than',
										value: 'files_lower_than',
										description: 'Number of attached files is less than the given number',
									},
									{
										name: 'Single Select Equal',
										value: 'single_select_equal',
										description: 'Single select option matches given option ID',
									},
									{
										name: 'Single Select Not Equal',
										value: 'single_select_not_equal',
										description: 'Single select option does not match given option ID',
									},
									{
										name: 'Single Select Is Any Of',
										value: 'single_select_is_any_of',
										description:
											'Single select option is one of the given option IDs. Format: `1,2,3`.',
									},
									{
										name: 'Single Select Is None Of',
										value: 'single_select_is_none_of',
										description:
											'Single select option is none of the given option IDs. Format: `1,2,3`.',
									},
									{
										name: 'Multiple Select Has',
										value: 'multiple_select_has',
										description:
											'Multiple select has at least one of the given option IDs. Format: `1,2,3`.',
									},
									{
										name: 'Multiple Select Has Not',
										value: 'multiple_select_has_not',
										description:
											'Multiple select has none of the given option IDs. Format: `1,2,3`.',
									},
									{
										name: 'Collaborators Has',
										value: 'multiple_collaborators_has',
										description: 'Field includes the given user ID',
									},
									{
										name: 'Collaborators Has Not',
										value: 'multiple_collaborators_has_not',
										description: 'Field excludes the given user ID',
									},
									{
										name: 'User Is',
										value: 'user_is',
										description: 'Row created by or last modified by the given user ID',
									},
									{
										name: 'User Is Not',
										value: 'user_is_not',
										description: 'Row was not created or modified by the given user ID',
									},
									{
										name: 'Link Row Has',
										value: 'link_row_has',
										description: 'Field links to the given row ID',
									},
									{
										name: 'Link Row Has Not',
										value: 'link_row_has_not',
										description: 'Field does not link to the given row ID',
									},
									{
										name: 'Link Row Contains',
										value: 'link_row_contains',
										description: 'Linked row value contains the given text (case-insensitive)',
									},
									{
										name: 'Link Row Not Contains',
										value: 'link_row_not_contains',
										description: 'Linked row value does not contain the given text',
									},
									{
										name: 'Is True',
										value: 'boolean',
										description: 'Boolean field is true (false if not set)',
									},
									{
										name: 'Is Empty',
										value: 'empty',
										description: 'Field is empty (null or blank)',
									},
									{ name: 'Is Not Empty', value: 'not_empty', description: 'Field is not empty' },
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
									'Field name to sort by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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

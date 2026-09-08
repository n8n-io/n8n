import {
	DEPRECATED_TIMEZONE_NUMBER_OPERATORS,
	DEPRECATED_TIMEZONE_ONLY_OPERATORS,
	MULTI_STEP_DATE_OPERATORS,
} from './GenericFunctions';
import type { INodeProperties } from 'n8n-workflow';

export const operationFields: INodeProperties[] = [
	// ----------------------------------
	//             shared
	// ----------------------------------
	{
		displayName: 'Database name or ID',
		name: 'databaseId',
		type: 'options',
		default: '0',
		required: true,
		description:
			'Database to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getDatabaseIds',
		},
		displayOptions: {
			hide: {
				authentication: ['databaseToken'],
			},
		},
	},
	{
		displayName: 'Table name or ID',
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
		displayName: 'Data to send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-map input data to columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define below for each column',
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
		displayName: 'Inputs to ignore',
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
		displayName: 'Fields to send',
		name: 'fieldsUi',
		placeholder: 'Add field',
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
						displayName: 'Field name or ID',
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
						displayName: 'Field value',
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
		placeholder: 'Add row',
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
										displayName: 'Field name or ID',
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
										displayName: 'Field value',
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
		displayName: 'Data to send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-map input data',
				value: 'autoMapInputData',
				description: 'Collect row IDs from input items automatically',
			},
			{
				name: 'Define below',
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
		placeholder: 'Add row ID',
		displayOptions: {
			show: {
				operation: ['batchDelete'],
				dataToSend: ['defineBelow'],
			},
		},
		description: 'IDs of the rows to delete',
	},
	{
		displayName: 'Property containing row ID',
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
		displayName: 'Return all',
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
				placeholder: 'Add filter',
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
								displayName: 'Field name or ID',
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
										name: 'Not equal',
										value: 'not_equal',
										description: 'Field value is not equal to the given value',
									},
									{
										name: 'Contains',
										value: 'contains',
										description: 'Field value contains the given substring (case-insensitive)',
									},
									{
										name: 'Contains not',
										value: 'contains_not',
										description:
											'Field value does not contain the given substring (case-insensitive)',
									},
									{
										name: 'Contains word',
										value: 'contains_word',
										description:
											'Field contains the full word (case-insensitive match on word boundaries)',
									},
									{
										name: 'Does not contain word',
										value: 'doesnt_contain_word',
										description: 'Field does not contain the full word (case-insensitive)',
									},
									{
										name: 'Length is lower than',
										value: 'length_is_lower_than',
										description: 'Field value length is shorter than the given number',
									},
									{
										name: 'Higher than',
										value: 'higher_than',
										description: 'Field value is greater than the given number',
									},
									{
										name: 'Higher than or equal',
										value: 'higher_than_or_equal',
										description: 'Field value is greater than or equal to the given number',
									},
									{
										name: 'Lower than',
										value: 'lower_than',
										description: 'Field value is less than the given number',
									},
									{
										name: 'Lower than or equal',
										value: 'lower_than_or_equal',
										description: 'Field value is less than or equal to the given number',
									},
									{
										name: 'Is even and whole',
										value: 'is_even_and_whole',
										description: 'Field value is an even whole number (no decimals)',
									},
									{
										name: 'Date is',
										value: 'date_is',
										description:
											'Date matches the given day. Enter a date as `YYYY-MM-DD` (timezone applied automatically).',
									},
									{
										name: 'Date is not',
										value: 'date_is_not',
										description:
											'Date does not match the given day. Enter a date as `YYYY-MM-DD` (timezone applied automatically).',
									},
									{
										name: 'Date is before',
										value: 'date_is_before',
										description:
											'Date is strictly before the given day. Enter a date as `YYYY-MM-DD` (timezone applied automatically).',
									},
									{
										name: 'Date is on or before',
										value: 'date_is_on_or_before',
										description:
											'Date is before or equal to the given day. Enter a date as `YYYY-MM-DD` (timezone applied automatically).',
									},
									{
										name: 'Date is after',
										value: 'date_is_after',
										description:
											'Date is strictly after the given day. Enter a date as `YYYY-MM-DD` (timezone applied automatically).',
									},
									{
										name: 'Date is on or after',
										value: 'date_is_on_or_after',
										description:
											'Date is after or equal to the given day. Enter a date as `YYYY-MM-DD` (timezone applied automatically).',
									},
									{
										name: 'Date is within',
										value: 'date_is_within',
										description:
											'Date is within the next X days. Enter the number of days (timezone applied automatically).',
									},
									{
										name: 'Date equals today',
										value: 'date_equals_today',
										description:
											'Date is today. Enter a timezone (e.g. `UTC`). Timezone field is used when value is empty. (Deprecated).',
									},
									{
										name: 'Date equals month',
										value: 'date_equals_month',
										description:
											'Date is in the current month. Enter a timezone (e.g. `UTC`). (Deprecated).',
									},
									{
										name: 'Date equals year',
										value: 'date_equals_year',
										description:
											'Date is in the current year. Enter a timezone (e.g. `UTC`). (Deprecated).',
									},
									{
										name: 'Date equals day of month',
										value: 'date_equals_day_of_month',
										description:
											'Day of month matches the given number (1-31); pass a raw number, not a formatted date',
									},
									{
										name: 'Date equal (deprecated)',
										value: 'date_equal',
										description:
											'Field is date. Enter `YYYY-MM-DD`. Prefer using Date Is (date_is).',
									},
									{
										name: 'Date not equal (deprecated)',
										value: 'date_not_equal',
										description:
											'Field is not date. Enter `YYYY-MM-DD`. Prefer using Date Is Not (date_is_not).',
									},
									{
										name: 'Date before (deprecated)',
										value: 'date_before',
										description:
											'Field before this date. Enter `YYYY-MM-DD`. Prefer using Date Is Before (date_is_before).',
									},
									{
										name: 'Date before or equal (deprecated)',
										value: 'date_before_or_equal',
										description:
											'Field on or before this date. Enter `YYYY-MM-DD`. Prefer using Date Is On Or Before (date_is_on_or_before).',
									},
									{
										name: 'Date after (deprecated)',
										value: 'date_after',
										description:
											'Field after this date. Enter `YYYY-MM-DD`. Prefer using Date Is After (date_is_after).',
									},
									{
										name: 'Date after or equal (deprecated)',
										value: 'date_after_or_equal',
										description:
											'Field after or equal to this date. Enter `YYYY-MM-DD`. Prefer using Date Is On Or After (date_is_on_or_after).',
									},
									{
										name: 'Date after days ago (deprecated)',
										value: 'date_after_days_ago',
										description:
											'Date is after X days ago. Enter the number of days (e.g. `20`). (Deprecated).',
									},
									{
										name: 'Date within days (deprecated)',
										value: 'date_within_days',
										description:
											'Date is within N days from today. Enter the number of days; timezone is applied automatically (e.g. `Asia/Calcutta?1`). (Deprecated).',
									},
									{
										name: 'Date within weeks (deprecated)',
										value: 'date_within_weeks',
										description:
											'Date is within N weeks from today. Enter the number of weeks; timezone is applied automatically. (Deprecated).',
									},
									{
										name: 'Date within months (deprecated)',
										value: 'date_within_months',
										description:
											'Date is within N months from today. Enter the number of months; timezone is applied automatically. (Deprecated).',
									},
									{
										name: 'Date equals days ago (deprecated)',
										value: 'date_equals_days_ago',
										description:
											'Date is exactly N days ago. Enter the number of days; timezone is applied automatically. (Deprecated).',
									},
									{
										name: 'Date equals months ago (deprecated)',
										value: 'date_equals_months_ago',
										description:
											'Date is exactly N months ago. Enter the number of months; timezone is applied automatically. (Deprecated).',
									},
									{
										name: 'Date equals years ago (deprecated)',
										value: 'date_equals_years_ago',
										description:
											'Date is exactly N years ago. Enter the number of years; timezone is applied automatically. (Deprecated).',
									},
									{
										name: 'Date before today (deprecated)',
										value: 'date_before_today',
										description:
											'Date is before today. Enter a timezone (e.g. `UTC`). (Deprecated).',
									},
									{
										name: 'Date after today (deprecated)',
										value: 'date_after_today',
										description:
											'Date is after today. Enter a timezone (e.g. `UTC`). (Deprecated).',
									},
									{
										name: 'Date equals current week (deprecated)',
										value: 'date_equals_week',
										description:
											'Date is within current week. Enter a timezone (e.g. `UTC`). (Deprecated).',
									},
									{
										name: 'Filename contains',
										value: 'filename_contains',
										description: 'Filename contains the given substring',
									},
									{
										name: 'Has file type',
										value: 'has_file_type',
										description: 'File type is "image" or "document"',
									},
									{
										name: 'Files lower than',
										value: 'files_lower_than',
										description: 'Number of attached files is less than the given number',
									},
									{
										name: 'Single select equal',
										value: 'single_select_equal',
										description: 'Single select option matches given option ID',
									},
									{
										name: 'Single select not equal',
										value: 'single_select_not_equal',
										description: 'Single select option does not match given option ID',
									},
									{
										name: 'Single select is any of',
										value: 'single_select_is_any_of',
										description:
											'Single select option is one of the given option IDs. Format: `1,2,3`.',
									},
									{
										name: 'Single select is none of',
										value: 'single_select_is_none_of',
										description:
											'Single select option is none of the given option IDs. Format: `1,2,3`.',
									},
									{
										name: 'Multiple select has',
										value: 'multiple_select_has',
										description:
											'Multiple select has at least one of the given option IDs. Format: `1,2,3`.',
									},
									{
										name: 'Multiple select has not',
										value: 'multiple_select_has_not',
										description:
											'Multiple select has none of the given option IDs. Format: `1,2,3`.',
									},
									{
										name: 'Collaborators has',
										value: 'multiple_collaborators_has',
										description: 'Field includes the given user ID',
									},
									{
										name: 'Collaborators has not',
										value: 'multiple_collaborators_has_not',
										description: 'Field excludes the given user ID',
									},
									{
										name: 'User is',
										value: 'user_is',
										description: 'Row created by or last modified by the given user ID',
									},
									{
										name: 'User is not',
										value: 'user_is_not',
										description: 'Row was not created or modified by the given user ID',
									},
									{
										name: 'Link row has',
										value: 'link_row_has',
										description: 'Field links to the given row ID',
									},
									{
										name: 'Link row has not',
										value: 'link_row_has_not',
										description: 'Field does not link to the given row ID',
									},
									{
										name: 'Link row contains',
										value: 'link_row_contains',
										description: 'Linked row value contains the given text (case-insensitive)',
									},
									{
										name: 'Link row not contains',
										value: 'link_row_not_contains',
										description: 'Linked row value does not contain the given text',
									},
									{
										name: 'Is true',
										value: 'boolean',
										description: 'Boolean field is true (false if not set)',
									},
									{
										name: 'Is empty',
										value: 'empty',
										description: 'Field is empty (null or blank)',
									},
									{ name: 'Is not empty', value: 'not_empty', description: 'Field is not empty' },
								],
								default: 'equal',
							},
							{
								displayName: 'Timezone',
								name: 'timezone',
								type: 'string',
								default: 'UTC',
								displayOptions: {
									show: {
										operator: [
											...MULTI_STEP_DATE_OPERATORS,
											...DEPRECATED_TIMEZONE_NUMBER_OPERATORS,
											...DEPRECATED_TIMEZONE_ONLY_OPERATORS,
										],
									},
								},
								description: 'Timezone used for date filter evaluation, e.g. UTC or Europe/Berlin',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to compare to. For date filters, enter a date as YYYY-MM-DD.',
								placeholder: 'e.g. 2026-06-17',
							},
						],
					},
				],
			},
			{
				displayName: 'Filter type',
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
				displayName: 'Search term',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Text to match (can be in any column)',
			},
			{
				displayName: 'Sorting',
				name: 'order',
				placeholder: 'Add sort order',
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
								displayName: 'Field name or ID',
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

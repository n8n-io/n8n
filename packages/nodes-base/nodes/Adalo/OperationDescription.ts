import {
	INodeProperties,
} from 'n8n-workflow';

export const operationFields: INodeProperties[] = [
	/**
	 * get
	 */

	{
		displayName: 'Element ID',
		name: 'elementId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the element to return',
	},

	/**
	 * update
	 */

	{
		displayName: 'Element ID',
		name: 'elementId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the row to update',
	},

	/**
	 * create / update
	 */

	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-map Input Data to Columns',
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
				operation: [
					'create',
					'update',
				],
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
				operation: [
					'create',
					'update',
				],
				dataToSend: [
					'autoMapInputData',
				],
			},
		},
		default: '',
		required: false,
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
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
				operation: [
					'create',
					'update',
				],
				dataToSend: [
					'defineBelow',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field ID',
						name: 'fieldId',
						type: 'string',
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

	/**
	 * delete
	 */

	{
		displayName: 'Element ID',
		name: 'elementId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
			},
		},
		default: '',
		required: true,
		description: 'ID of the element to delete',
	},

	/**
	 * getAll
	 */

	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		typeOptions: {
			minValue: 0,
		},
		required: false,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
		description: 'You can get the next page of results by using the offset parameter to specify how many records to skip.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
		description: 'You can request up to 100 records per page using the limit parameter.',
	},
];

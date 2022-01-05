import {
	INodeProperties,
} from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new deal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deal',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update deal properties',
			},

		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const dealFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  deal:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular deal',
	},


	/* -------------------------------------------------------------------------- */
	/*                                  deal:get all                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                deal:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Close Date',
		name: 'closeDate',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Closing date of deal.',
	},
	{
		displayName: 'Expected Value',
		name: 'expectedValue',
		type: 'number',
		required: true,
		typeOptions: {
			minValue: 0,
			maxValue: 1000000000000,
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: 1,
		description: 'Expected Value of deal.',
	},
	{
		displayName: 'Milestone',
		name: 'milestone',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Milestone of deal.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Name of deal.',
	},
	{
		displayName: 'Probability',
		name: 'probability',
		type: 'number',
		required: true,
		typeOptions: {
			minValue: 0,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: 50,
		description: 'Expected probability.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: ' Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: `Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-deals---companies-api">here</a>.`,
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
					'deal',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Contact Ids',
				name: 'contactIds',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add ID',
				},
				default: [],
				description: 'Unique contact identifiers.',
			},
			{
				displayName: 'Custom Data',
				name: 'customData',
				type: 'fixedCollection',
				default: {},
				description: 'Custom Data',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Property',
						name: 'customProperty',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								required: true,
								default: '',
								description: 'Property name.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Property value.',
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  deal:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'ID of deal to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                deal:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Id of deal to update',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},

		description: `Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-deals---companies-api">here</a>.`,
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
					'deal',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Expected Value',
				name: 'expectedValue',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 10000,
				},
				default: '',
				description: 'Expected Value of deal.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of deal.',
			},
			{
				displayName: 'Probability',
				name: 'probability',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: 50,
				description: 'Expected Value of deal.',
			},
			{
				displayName: 'Contact Ids',
				name: 'contactIds',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add ID',
				},
				default: [],
				description: 'Unique contact identifiers.',
			},
			{
				displayName: 'Custom Data',
				name: 'customData',
				type: 'fixedCollection',
				default: {},
				description: 'Custom Data',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Property',
						name: 'customProperty',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								required: true,
								default: '',
								description: 'Property name.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Property value.',
							},
						],
					},
				],
			},
		],
	},
];

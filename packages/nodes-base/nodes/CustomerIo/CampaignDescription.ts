import { INodeProperties } from 'n8n-workflow';

export const campaignOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Trigger',
				value: 'trigger',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const campaignFields = [

/* -------------------------------------------------------------------------- */
/*                                   campaign:trigger                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
				operation: [
					'trigger'
				]
			},
		},
		description: 'The unique identifier for the campaign.',
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
					'campaign',
				],
				operation: [
					'trigger'
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
					'campaign',
				],
				operation: [
					'trigger'
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: 'Object of values to set as described <a href="https://customer.io/docs/api/" target="_blank">here</a>.',
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
					'campaign',
				],
				operation: [
					'trigger'
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Custom Properties',
				name: 'customProperties',
				type: 'fixedCollection',
				description: 'Custom Properties',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Property',
						name: 'customProperty',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								required: true,
								default: '',
								description: 'Property name.',
								placeholder: 'Plan'
							},

							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'Property value.',
								placeholder: 'Basic'
							},
						],
					},
				]
			},
			{
				displayName: 'Recipients',
				name: 'recipients',
				type: 'string',
				default: '',
				description: 'Additional recipient conditions to filter recipients. If this is used, none of ids, emails, per_user_data, or data_file_url may be used.',
			},
			{
				displayName: 'Ids',
				name: 'ids',
				type: 'string',
				default: '',
				description: 'List of profile ids to use as campaign recipients. If this is used, none of recipients, emails, per_user_data, or data_file_url may be used.',
			},
			{
				displayName: 'ID Ignore Missing',
				name: 'idIgnoreMissing',
				type: 'boolean',
				default: false,
				description: 'If false a missing id is an error.',
			},
			{
				displayName: 'Emails',
				name: 'emails',
				type: 'string',
				default: '',
				description: 'List of email addresses which are mapped to customer.io profiles and used as campaign recipients.',
			},
			{
				displayName: 'Email Ignore Missing',
				name: 'emailIgnoreMissing',
				type: 'boolean',
				default: false,
				description: 'If false a missing email address is an error.',
			},
			{
				displayName: 'Email Add Duplicates',
				name: 'emailAddDuplicates',
				type: 'boolean',
				default: false,
				description: 'If false an email address associated with more than one profile id is an error.',
			},
			{
				displayName: 'Per User Data',
				name: 'perUserData',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'an array of up to 10K json maps containing either "id" and "data" keys or "email" and "data" keys. If this is used, none of recipients, ids, emails, or data_file_url may be used.',
			},
			{
				displayName: 'Data File URL',
				name: 'dataFileUrl',
				type: 'string',
				default: '',
				description: 'A url from which we will retrieve a data file containing per-user data, each line containing a json map with either "id" and "data" or "email" and "data" keys. If this is used, none of recipeints, ids, emails, or per_user_data may be used.',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                   campaign:get                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
				operation: [
					'get'
				]
			},
		},
		description: 'The unique identifier for the campaign.',
	},
	{
		displayName: 'Trigger ID',
		name: 'triggerId',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
				operation: [
					'get'
				]
			},
		},
		description: 'Custom Liquid merge data to include with the trigger.',
	},
] as INodeProperties[];

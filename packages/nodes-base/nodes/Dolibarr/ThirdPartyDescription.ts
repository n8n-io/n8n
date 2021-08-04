import {
	INodeProperties,
} from 'n8n-workflow';

export const thirdPartyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'thirdParty',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a third party',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a third party',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a third party',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a third party',
			},
			{
				name: 'List',
				value: 'list',
				description: 'Get all third parties',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const thirdPartyFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 thirdParty:list                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'thirdParty',
				],
				operation: [
					'list',
				],
			},
		},
		options: [
			{
				displayName: 'Limit for list (100 contacts by default)',
				name: 'limit',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Select page number (0 by default)',
				name: 'page',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 thirdParty:create                             */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'JSON',
		name: 'json',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'thirdParty',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 thirdParty:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Third party ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'thirdParty',
				],
				operation: [
					'update',
				],
			},
		},
	},

	{
		displayName: 'JSON',
		name: 'json',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'thirdParty',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 thirdParty:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Third party ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'thirdParty',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 thirdParty:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Third party ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'thirdParty',
				],
			},
		},
		default: '',
	},
] as INodeProperties[];

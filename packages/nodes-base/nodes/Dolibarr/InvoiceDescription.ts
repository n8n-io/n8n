import {
	INodeProperties,
} from 'n8n-workflow';

export const invoiceOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an invoice',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an invoice',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an invoice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an invoice',
			},
			{
				name: 'List',
				value: 'list',
				description: 'Get all invoices',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const invoiceFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 invoice:list                             */
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
					'invoice',
				],
				operation: [
					'list',
				],
			},
		},
		options: [
			{
				displayName: 'Limit for list',
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
	/*                                 invoice:create                             */
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
					'invoice',
				],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 invoice:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invoice ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invoice',
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
					'invoice',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 invoice:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invoice ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 invoice:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invoice ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'invoice',
				],
			},
		},
		default: '',
	},
] as INodeProperties[];

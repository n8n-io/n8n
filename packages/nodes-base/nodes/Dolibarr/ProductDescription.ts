import {
	INodeProperties,
} from 'n8n-workflow';

export const productOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a product',
			},
			{
				name: 'List',
				value: 'list',
				description: 'Get all products',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const productFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 product:list                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Get',
		name: 'listOperation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'list',
				],
			},
		},
		options: [
			{
				name: 'Properties',
				value: 'properties',
				description: 'Get properties',
			},
			{
				name: 'Purchase prices',
				value: 'purchasePrices',
				description: 'Get purchase prices',
			},
		],
		default: 'properties',
	},
	
	
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsPro',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'list',
				],
				listOperation: [
					'properties',
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
	
	
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsPur',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'list',
				],
				listOperation: [
					'purchasePrices',
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
			{
				displayName: 'Filter list by supplier ID',
				name: 'supplier',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 product:create                             */
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
					'product',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 product:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update',
		name: 'updateOperation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				name: 'Properties',
				value: 'properties',
				description: 'Update properties',
			},
			{
				name: 'Purchase prices',
				value: 'purchasePrices',
				description: 'Update/create purchase prices',
			},
		],
		default: 'properties',
	},
	
	{
		displayName: 'Product ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'product',
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
					'product',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 product:delete                             */
	/* -------------------------------------------------------------------------- */
{
		displayName: 'Delete',
		name: 'deleteOperation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'delete',
				],
			},
		},
		options: [
			{
				name: 'Properties',
				value: 'properties',
				description: 'Delete a product',
			},
			{
				name: 'Purchase prices',
				value: 'purchasePrices',
				description: 'Delete purchase price of a product',
			},
		],
		default: 'properties',
	},
	
	{
		displayName: 'Product ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	{
		displayName: 'Purchase price ID',
		name: 'purchasePriceId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'product',
				],
				deleteOperation: [
					'purchasePrices',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 product:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Get method',
		name: 'getOperation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'getId',
				description: 'Get a product by ID',
			},
			{
				name: 'Ref',
				value: 'getRef',
				description: 'Get a product by ref',
			},
		],
		default: 'getId',
	},
	
	{
		displayName: 'Get',
		name: 'idOperation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'get',
				],
				getOperation: [
					'getId',
				],
			},
		},
		options: [
			{
				name: 'Properties',
				value: 'properties',
				description: 'Get properties of a product',
			},
			{
				name: 'Purchase prices',
				value: 'purchasePrices',
				description: 'Get purchase prices for a product',
			},
		],
		default: 'properties',
	},
	
	{
		displayName: 'Product ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				getOperation: [
					'getId',
				],
				resource: [
					'product',
				],
			},
		},
		default: '',
	},
	
	
	{
		displayName: 'Product ref',
		name: 'ref',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				getOperation: [
					'getRef',
				],
				resource: [
					'product',
				],
			},
		},
		default: '',
	},
	
] as INodeProperties[];

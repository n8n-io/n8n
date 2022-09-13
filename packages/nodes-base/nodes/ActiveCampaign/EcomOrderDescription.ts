import { INodeProperties } from 'n8n-workflow';

import { allCurrencies } from './currencies';

import { activeCampaignDefaultGetAllProperties } from './GenericFunctions';

export const ecomOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['ecommerceOrder'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a order',
				action: 'Create an e-commerce order',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a order',
				action: 'Delete an e-commerce order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a order',
				action: 'Get an e-commerce order',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many orders',
				action: 'Get many e-commerce orders',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a order',
				action: 'Update an e-commerce order',
			},
		],
		default: 'create',
	},
];

export const ecomOrderFields: INodeProperties[] = [
	// ----------------------------------
	//         ecommerceOrder:create
	// ----------------------------------
	{
		displayName: 'External ID',
		name: 'externalid',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description:
			'The ID of the order in the external service. ONLY REQUIRED IF EXTERNALCHECKOUTID NOT INCLUDED.',
	},
	{
		displayName: 'External Checkout ID',
		name: 'externalcheckoutid',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description:
			'The ID of the cart in the external service. ONLY REQUIRED IF EXTERNALID IS NOT INCLUDED.',
	},
	{
		displayName: 'Order Source',
		name: 'source',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description:
			'The order source code (0 - will not trigger automations, 1 - will trigger automations)',
	},
	{
		displayName: 'Customer Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description: 'The email address of the customer who placed the order',
	},
	{
		displayName: 'Total Price',
		name: 'totalPrice',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description:
			'The total price of the order in cents, including tax and shipping charges. (i.e. $456.78 => 45678). Must be greater than or equal to zero.',
	},
	{
		displayName: 'Order Currency',
		name: 'currency',
		type: 'options',
		default: 'eur',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		options: allCurrencies,
		description: 'The currency of the order (3-digit ISO code, e.g., "USD")',
	},
	{
		displayName: 'Connection ID',
		name: 'connectionid',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description: 'The ID of the connection from which this order originated',
	},
	{
		displayName: 'Customer ID',
		name: 'customerid',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description: 'The ID of the customer associated with this order',
	},
	{
		displayName: 'Creation Date',
		name: 'externalCreatedDate',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description: 'The date the order was placed',
	},
	{
		displayName: 'Abandoning Date',
		name: 'abandonedDate',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		description: 'The date the cart was abandoned. REQUIRED ONLY IF INCLUDING EXTERNALCHECKOUTID.',
	},
	{
		displayName: 'Products',
		name: 'orderProducts',
		type: 'collection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add product',
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		default: {},
		description: 'All ordered products',
		placeholder: 'Add product field',
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the product',
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'number',
				default: 0,
				description:
					'The price of the product, in cents. (i.e. $456.78 => 45678). Must be greater than or equal to zero.',
			},
			{
				displayName: 'Product Quantity',
				name: 'quantity',
				type: 'number',
				default: 0,
				description: 'The quantity ordered',
			},
			{
				displayName: 'Product External ID',
				name: 'externalid',
				type: 'string',
				default: '',
				description: 'The ID of the product in the external service',
			},
			{
				displayName: 'Product Category',
				name: 'category',
				type: 'string',
				default: '',
				description: 'The category of the product',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				default: '',
				description: 'The SKU for the product',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the product',
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				default: '',
				description: 'An Image URL that displays an image of the product',
			},
			{
				displayName: 'Product URL',
				name: 'productUrl',
				type: 'string',
				default: '',
				description: 'A URL linking to the product in your store',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ecommerceOrder'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Shipping Amount',
				name: 'shippingAmount',
				type: 'number',
				default: 0,
				description: 'The total shipping amount for the order in cents',
			},

			{
				displayName: 'Tax Amount',
				name: 'taxAmount',
				type: 'number',
				default: 0,
				description: 'The total tax amount for the order in cents',
			},
			{
				displayName: 'Discount Amount',
				name: 'discountAmount',
				type: 'number',
				default: 0,
				description: 'The total discount amount for the order in cents',
			},
			{
				displayName: 'Order URL',
				name: 'orderUrl',
				type: 'string',
				default: '',
				description: 'The URL for the order in the external service',
			},
			{
				displayName: 'External Updated Date',
				name: 'externalUpdatedDate',
				type: 'dateTime',
				default: '',
				description: 'The date the order was updated',
			},
			{
				displayName: 'Shipping Method',
				name: 'shippingMethod',
				type: 'string',
				default: '',
				description: 'The shipping method of the order',
			},
			{
				displayName: 'Order Number',
				name: 'orderNumber',
				type: 'string',
				default: '',
				description: 'The order number. This can be different than the externalid.',
			},
		],
	},

	// ----------------------------------
	//         ecommerceOrder:update
	// ----------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['ecommerceOrder'],
			},
		},
		description: 'The ID of the e-commerce order',
	},

	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['ecommerceOrder'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'External ID',
				name: 'externalid',
				type: 'string',
				default: '',
				description:
					'The ID of the order in the external service. ONLY REQUIRED IF EXTERNALCHECKOUTID NOT INCLUDED.',
			},
			{
				displayName: 'External Checkout ID',
				name: 'externalcheckoutid',
				type: 'string',
				default: '',
				description:
					'The ID of the cart in the external service. ONLY REQUIRED IF EXTERNALID IS NOT INCLUDED.',
			},
			{
				displayName: 'Order Source',
				name: 'source',
				type: 'number',
				default: 0,
				description:
					'The order source code (0 - will not trigger automations, 1 - will trigger automations)',
			},
			{
				displayName: 'Customer Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'The email address of the customer who placed the order',
			},
			{
				displayName: 'Total Price',
				name: 'totalPrice',
				type: 'number',
				default: 0,
				description:
					'The total price of the order in cents, including tax and shipping charges. (i.e. $456.78 => 45678). Must be greater than or equal to zero.',
			},
			{
				displayName: 'Order Currency',
				name: 'currency',
				type: 'options',
				default: 'eur',
				options: allCurrencies,
				description: 'The currency of the order (3-digit ISO code, e.g., "USD")',
			},
			{
				displayName: 'Connection ID',
				name: 'connectionid',
				type: 'number',
				default: 0,
				description: 'The ID of the connection from which this order originated',
			},
			{
				displayName: 'Customer ID',
				name: 'customerid',
				type: 'number',
				default: 0,
				description: 'The ID of the customer associated with this order',
			},
			{
				displayName: 'Creation Date',
				name: 'externalupdatedDate',
				type: 'dateTime',
				default: '',
				description: 'The date the order was placed',
			},
			{
				displayName: 'Abandoning Date',
				name: 'abandonedDate',
				type: 'dateTime',
				default: '',
				description:
					'The date the cart was abandoned. REQUIRED ONLY IF INCLUDING EXTERNALCHECKOUTID.',
			},
			{
				displayName: 'Shipping Amount',
				name: 'shippingAmount',
				type: 'number',
				default: 0,
				description: 'The total shipping amount for the order in cents',
			},

			{
				displayName: 'Tax Amount',
				name: 'taxAmount',
				type: 'number',
				default: 0,
				description: 'The total tax amount for the order in cents',
			},
			{
				displayName: 'Discount Amount',
				name: 'discountAmount',
				type: 'number',
				default: 0,
				description: 'The total discount amount for the order in cents',
			},
			{
				displayName: 'Order URL',
				name: 'orderUrl',
				type: 'string',
				default: '',
				description: 'The URL for the order in the external service',
			},
			{
				displayName: 'External Updated Date',
				name: 'externalUpdatedDate',
				type: 'dateTime',
				default: '',
				description: 'The date the order was updated',
			},
			{
				displayName: 'Shipping Method',
				name: 'shippingMethod',
				type: 'string',
				default: '',
				description: 'The shipping method of the order',
			},
			{
				displayName: 'Order Number',
				name: 'orderNumber',
				type: 'string',
				default: '',
				description: 'The order number. This can be different than the externalid.',
			},

			{
				displayName: 'Products',
				name: 'orderProducts',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add product',
				},
				default: {},
				description: 'All ordered products',
				placeholder: 'Add product field',
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the product',
					},
					{
						displayName: 'Price',
						name: 'price',
						type: 'number',
						default: 0,
						description:
							'The price of the product, in cents. (i.e. $456.78 => 45678). Must be greater than or equal to zero.',
					},
					{
						displayName: 'Product Quantity',
						name: 'quantity',
						type: 'number',
						default: 0,
						description: 'The quantity ordered',
					},
					{
						displayName: 'Product External ID',
						name: 'externalid',
						type: 'string',
						default: '',
						description: 'The ID of the product in the external service',
					},
					{
						displayName: 'Product Category',
						name: 'category',
						type: 'string',
						default: '',
						description: 'The category of the product',
					},
					{
						displayName: 'SKU',
						name: 'sku',
						type: 'string',
						default: '',
						description: 'The SKU for the product',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the product',
					},
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						description: 'An Image URL that displays an image of the product',
					},
					{
						displayName: 'Product URL',
						name: 'productUrl',
						type: 'string',
						default: '',
						description: 'A URL linking to the product in your store',
					},
				],
			},
		],
	},

	// ----------------------------------
	//         ecommerceOrder:delete
	// ----------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['ecommerceOrder'],
			},
		},
		description: 'The ID of the e-commerce order',
	},

	// ----------------------------------
	//         ecommerceOrder:get
	// ----------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['ecommerceOrder'],
			},
		},
		description: 'The ID of the e-commerce order',
	},

	// ----------------------------------
	//         ecommerceOrder:getAll
	// ----------------------------------
	...activeCampaignDefaultGetAllProperties('ecommerceOrder', 'getAll'),
];

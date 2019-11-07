import { INodeProperties } from "n8n-workflow";

export const ecomOrderProductsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'ecommerceOrderProducts',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all order products',
			},
			{
				name: 'Get by Product ID',
				value: 'getByProductId',
				description: 'Get data of a ordered product',
			},
			{
				name: 'Get by Order ID',
				value: 'getByOrderId',
				description: 'Get data of an order\'s products',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const ecomOrderProductsFields = [
	// ----------------------------------
	//         ecommerceOrderProducts:getByOrderId
	// ----------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: [
					'getByOrderId',
				],
				resource: [
					'ecommerceOrderProducts',
				],
			},
		},
		description: 'The ID of the order whose products you\'d like returned.',
	},

	// ----------------------------------
	//         ecommerceOrderProducts:getByProductId
	// ----------------------------------
	{
		displayName: 'Product ID',
		name: 'procuctId',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				operation: [
					'getByProductId',
				],
				resource: [
					'ecommerceOrderProducts',
				],
			},
		},
		description: 'The ID of the product you\'d like returned.',
	},

	// ----------------------------------
	//         ecommerceOrderProducts:getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'ecommerceOrderProducts',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'ecommerceOrderProducts',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
] as INodeProperties[];
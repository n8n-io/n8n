import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	activeCampaignApiRequest,
	activeCampaignApiRequestAllItems,
} from './GenericFunctions';

import { returnAllCurrencyOptions } from './currencies'

interface CustomProperty {
	name: string;
	value: string;
}


/**
 * Add the additional fields to the body
 *
 * @param {IDataObject} body The body object to add fields to
 * @param {IDataObject} additionalFields The fields to add
 */
function addAdditionalFields(body: IDataObject, additionalFields: IDataObject) {
	for (const key of Object.keys(additionalFields)) {
		if (key === 'customProperties' && (additionalFields.customProperties as IDataObject).property !== undefined) {
			for (const customProperty of (additionalFields.customProperties as IDataObject)!.property! as CustomProperty[]) {
				body[customProperty.name] = customProperty.value;
			}
		} else {
			body[key] = additionalFields[key];
		}
	}
}

export class ActiveCampaign implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ActiveCampaign',
		name: 'activeCampaign',
		icon: 'file:activeCampaign.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and edit data in ActiveCampaign',
		defaults: {
			name: 'ActiveCampaign',
			color: '#356ae6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'activeCampaignApi',
				required: true,
			}
		],
		properties: [

			// ----------------------------------
			//         resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: "E-commerce order",
						value: "ecommerceOrder"
					}
				],
				default: 'contact',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a contact',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a contact',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a contact',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all contact',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a contact',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

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
						description: 'Create a deal',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a deal',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a deal',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all deals',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a deal',
					},
					{
						name: 'Create Note',
						value: 'createNote',
						description: 'Create a deal note',
					},
					{
						name: 'Update deal note',
						value: 'updateNote',
						description: 'Update a deal note',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'ecommerceOrder',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a order',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a order',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a order',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all orders',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a order',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         contact
			// ----------------------------------

			// ----------------------------------
			//         contact:create
			// ----------------------------------
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'contact',
						],
					},
				},
				description: 'The email of the contact to create',
			},
			{
				displayName: 'Update if exists',
				name: 'updateIfExists',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'contact',
						],
					},
				},
				default: false,
				description: 'Update user if it exists already. If not set and user exists it will error instead.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'contact',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'The first name of the contact to create',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'The last name of the contact to create',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'Phone number of the contact.',
					},
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								]
							},
						],
					},
				],
			},

			// ----------------------------------
			//         contact:update
			// ----------------------------------
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'contact',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the contact to update.',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				description: 'The fields to update.',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'contact',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						description: 'Email of the contact.',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'First name of the contact',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'Last name of the contact',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'Phone number of the contact.',
					},
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								]
							},
						],
					},
				],
			},

			// ----------------------------------
			//         contact:delete
			// ----------------------------------
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'contact',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the contact to delete.',
			},

			// ----------------------------------
			//         contact:get
			// ----------------------------------
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'contact',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the contact to get.',
			},

			// ----------------------------------
			//         contact:getAll
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
							'contact',
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
							'contact',
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


			// ----------------------------------
			//         deal
			// ----------------------------------

			// ----------------------------------
			//         deal:create
			// ----------------------------------
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The title of the deal',
			},
			{
				displayName: 'Deal\'s contact ID',
				name: 'contact',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The ID of the deal\'s contact',
			},
			{
				displayName: 'Deal value',
				name: 'value',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The value of the deal in cents',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'options',
				default: 'eur',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'deal',
						],
					},
				},
				options: returnAllCurrencyOptions(),
				description: 'The currency of the deal in 3-character ISO format',
			},
			{
				displayName: 'Deal pipeline ID',
				name: 'owner',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The pipeline ID of the deal',
			},
			{
				displayName: 'Deal stage ID',
				name: 'stage',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The stage ID of the deal',
			},
			{
				displayName: 'Deal owner ID',
				name: 'owner',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The owner ID of the deal',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'deal',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the deal',
					},

					{
						displayName: 'Deal percentage',
						name: 'percent',
						type: 'number',
						default: 0,
						description: 'The percentage of the deal',
					},
					{
						displayName: 'Deal status',
						name: 'status',
						type: 'number',
						default: 0,
						description: 'The status of the deal',
					},
				]
			},

			// ----------------------------------
			//         deal:update
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'deal',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the deal to update.',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				description: 'The fields to update.',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'deal',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The title of the deal',
					},
					{
						displayName: 'Deal\'s contact ID',
						name: 'contact',
						type: 'number',
						default: 0,
						description: 'The ID of the deal\'s contact',
					},
					{
						displayName: 'Deal value',
						name: 'value',
						type: 'number',
						default: 0,
						description: 'The value of the deal in cents',
					},
					{
						displayName: 'Currency',
						name: 'currency',
						type: 'options',
						options: returnAllCurrencyOptions(),
						default: 'eur',
						description: 'The currency of the deal in 3-character ISO format',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the deal',
					},
					{
						displayName: 'Deal pipeline ID',
						name: 'owner',
						type: 'string',
						default: '',
						description: 'The pipeline ID of the deal',
					},
					{
						displayName: 'Deal stage ID',
						name: 'stage',
						type: 'string',
						default: '',
						description: 'The stage ID of the deal',
					},
					{
						displayName: 'Deal owner ID',
						name: 'owner',
						type: 'string',
						default: '',
						description: 'The owner ID of the deal',
					},
					{
						displayName: 'Deal percentage',
						name: 'percent',
						type: 'number',
						default: 0,
						description: 'The percentage of the deal',
					},
					{
						displayName: 'Deal status',
						name: 'status',
						type: 'number',
						default: 0,
						description: 'The status of the deal',
					},
				]
			},

			// ----------------------------------
			//         deal:delete
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The ID of the deal',
			},

			// ----------------------------------
			//         deal:get
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The ID of the deal',
			},

			// ----------------------------------
			//         deal:getAll
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
							'deal',
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
							'deal',
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

			// ----------------------------------
			//         dealNote:create
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createNote',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The ID of the deal note',
			},
			{
				displayName: 'Deal Note',
				name: 'dealNote',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createNote',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The content of the deal note',
			},

			// ----------------------------------
			//         dealNote:update
			// ----------------------------------
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'number',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'updateNote',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The ID of the deal note',
			},
			{
				displayName: 'Deal note ID',
				name: 'dealNoteId',
				type: 'number',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'updateNote',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The ID of the deal note',
			},
			{
				displayName: 'Deal Note',
				name: 'dealNote',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'updateNote',
						],
						resource: [
							'deal',
						],
					},
				},
				description: 'The content of the deal note',
			},

			// ----------------------------------
			//         ecommerceOrder
			// ----------------------------------

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
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The id of the order in the external service. ONLY REQUIRED IF EXTERNALCHECKOUTID NOT INCLUDED',
			},
			{
				displayName: 'External checkout ID',
				name: 'externalcheckoutid',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The id of the cart in the external service. ONLY REQUIRED IF EXTERNALID IS NOT INCLUDED.',
			},
			{
				displayName: 'Order source',
				name: 'source',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The order source code (0 - will not trigger automations, 1 - will trigger automations).',
			},
			{
				displayName: 'Customer Email',
				name: 'email',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The email address of the customer who placed the order.',
			},
			{
				displayName: 'Total price',
				name: 'totalPrice',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The total price of the order in cents, including tax and shipping charges. (i.e. $456.78 => 45678). Must be greater than or equal to zero.',
			},
			{
				displayName: 'Order currency',
				name: 'currency',
				type: 'options',
				default: 'eur',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				options: returnAllCurrencyOptions(),
				description: 'The currency of the order (3-digit ISO code, e.g., "USD").',
			},
			{
				displayName: 'Connection ID',
				name: 'connectionid',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The id of the connection from which this order originated.',
			},
			{
				displayName: 'Customer ID',
				name: 'customerid',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The id of the customer associated with this order.',
			},
			{
				displayName: 'Creation Date',
				name: 'externalCreatedDate',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The date the order was placed.',
			},
			{
				displayName: 'Abandoning Date',
				name: 'abandonedDate',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
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
						operation: [
							'create'
						],
						resource: [
							'ecommerceOrder',
						],
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
						description: 'The price of the product, in cents. (i.e. $456.78 => 45678). Must be greater than or equal to zero.',
					},
					{
						displayName: 'Product Quantity',
						name: 'quantity',
						type: 'number',
						default: 0,
						description: 'The quantity ordered.',
					},
					{
						displayName: 'Product external ID',
						name: 'externalid',
						type: 'string',
						default: '',
						description: 'The id of the product in the external service.',
					},
					{
						displayName: 'Product Category',
						name: 'category',
						type: 'string',
						default: '',
						description: 'The category of the product.',
					},
					{
						displayName: 'SKU',
						name: 'sku',
						type: 'string',
						default: '',
						description: 'The SKU for the product.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the product.',
					},
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						description: 'An Image URL that displays an image of the product.',
					},
					{
						displayName: 'Product URL',
						name: 'productUrl',
						type: 'string',
						default: '',
						description: 'A URL linking to the product in your store.',
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
						operation: [
							'create',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Shipping Amount',
						name: 'shippingAmount',
						type: 'number',
						default: 0,
						description: 'The total shipping amount for the order in cents .',
					},

					{
						displayName: 'Tax Amount',
						name: 'taxAmount',
						type: 'number',
						default: 0,
						description: 'The total tax amount for the order in cents.',
					},
					{
						displayName: 'Discount Amount',
						name: 'discountAmount',
						type: 'number',
						default: 0,
						description: 'The total discount amount for the order in cents.',
					},
					{
						displayName: 'Order URL',
						name: 'orderUrl',
						type: 'string',
						default: '',
						description: 'The URL for the order in the external service.',
					},
					{
						displayName: 'External updated date',
						name: 'externalUpdatedDate',
						type: 'dateTime',
						default: '',
						description: 'The date the order was updated.',
					},
					{
						displayName: 'Shipping Method',
						name: 'shippingMethod',
						type: 'string',
						default: '',
						description: 'The shipping method of the order.',
					},
					{
						displayName: 'Order Number',
						name: 'orderNumber',
						type: 'string',
						default: '',
						description: 'The order number. This can be different than the externalid.',
					},

				]
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
						operation: [
							'update',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The id of the e-commerce order.',
			},
			
			{
				displayName: 'Add Field',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'External ID',
						name: 'externalid',
						type: 'string',
						default: '',
						description: 'The id of the order in the external service. ONLY REQUIRED IF EXTERNALCHECKOUTID NOT INCLUDED',
					},
					{
						displayName: 'External checkout ID',
						name: 'externalcheckoutid',
						type: 'string',
						default: '',
						description: 'The id of the cart in the external service. ONLY REQUIRED IF EXTERNALID IS NOT INCLUDED.',
					},
					{
						displayName: 'Order source',
						name: 'source',
						type: 'number',
						default: 0,
						description: 'The order source code (0 - will not trigger automations, 1 - will trigger automations).',
					},
					{
						displayName: 'Customer Email',
						name: 'email',
						type: 'string',
						default: '',
						description: 'The email address of the customer who placed the order.',
					},
					{
						displayName: 'Total price',
						name: 'totalPrice',
						type: 'number',
						default: 0,
						description: 'The total price of the order in cents, including tax and shipping charges. (i.e. $456.78 => 45678). Must be greater than or equal to zero.',
					},
					{
						displayName: 'Order currency',
						name: 'currency',
						type: 'options',
						default: 'eur',
						options: returnAllCurrencyOptions(),
						description: 'The currency of the order (3-digit ISO code, e.g., "USD").',
					},
					{
						displayName: 'Connection ID',
						name: 'connectionid',
						type: 'number',
						default: 0,
						description: 'The id of the connection from which this order originated.',
					},
					{
						displayName: 'Customer ID',
						name: 'customerid',
						type: 'number',
						default: 0,
						description: 'The id of the customer associated with this order.',
					},
					{
						displayName: 'Creation Date',
						name: 'externalupdatedDate',
						type: 'dateTime',
						default: '',
						description: 'The date the order was placed.',
					},
					{
						displayName: 'Abandoning Date',
						name: 'abandonedDate',
						type: 'dateTime',
						default: '',
						description: 'The date the cart was abandoned. REQUIRED ONLY IF INCLUDING EXTERNALCHECKOUTID.',
					},
					{
						displayName: 'Shipping Amount',
						name: 'shippingAmount',
						type: 'number',
						default: 0,
						description: 'The total shipping amount for the order in cents .',
					},

					{
						displayName: 'Tax Amount',
						name: 'taxAmount',
						type: 'number',
						default: 0,
						description: 'The total tax amount for the order in cents.',
					},
					{
						displayName: 'Discount Amount',
						name: 'discountAmount',
						type: 'number',
						default: 0,
						description: 'The total discount amount for the order in cents.',
					},
					{
						displayName: 'Order URL',
						name: 'orderUrl',
						type: 'string',
						default: '',
						description: 'The URL for the order in the external service.',
					},
					{
						displayName: 'External updated date',
						name: 'externalUpdatedDate',
						type: 'dateTime',
						default: '',
						description: 'The date the order was updated.',
					},
					{
						displayName: 'Shipping Method',
						name: 'shippingMethod',
						type: 'string',
						default: '',
						description: 'The shipping method of the order.',
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
								description: 'The price of the product, in cents. (i.e. $456.78 => 45678). Must be greater than or equal to zero.',
							},
							{
								displayName: 'Product Quantity',
								name: 'quantity',
								type: 'number',
								default: 0,
								description: 'The quantity ordered.',
							},
							{
								displayName: 'Product external ID',
								name: 'externalid',
								type: 'string',
								default: '',
								description: 'The id of the product in the external service.',
							},
							{
								displayName: 'Product Category',
								name: 'category',
								type: 'string',
								default: '',
								description: 'The category of the product.',
							},
							{
								displayName: 'SKU',
								name: 'sku',
								type: 'string',
								default: '',
								description: 'The SKU for the product.',
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'The description of the product.',
							},
							{
								displayName: 'Image URL',
								name: 'imageUrl',
								type: 'string',
								default: '',
								description: 'An Image URL that displays an image of the product.',
							},
							{
								displayName: 'Product URL',
								name: 'productUrl',
								type: 'string',
								default: '',
								description: 'A URL linking to the product in your store.',
							},
						],
					},

				]
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
						operation: [
							'delete',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The id of the e-commerce order.',
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
						operation: [
							'get',
						],
						resource: [
							'ecommerceOrder',
						],
					},
				},
				description: 'The id of the e-commerce order.',
			},

			// ----------------------------------
			//         ecommerceOrder:getAll
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
							'ecommerceOrder',
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
							'ecommerceOrder',
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
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let resource: string;
		let operation: string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;
		let dataKey: string | undefined;

		for (let i = 0; i < items.length; i++) {
			dataKey = undefined;
			resource = this.getNodeParameter('resource', 0) as string;
			operation = this.getNodeParameter('operation', 0) as string;

			requestMethod = 'GET';
			endpoint = '';
			body = {} as IDataObject;
			qs = {} as IDataObject;

			if (resource === 'contact') {
				if (operation === 'create') {
					// ----------------------------------
					//         contact:create
					// ----------------------------------

					requestMethod = 'POST';

					const updateIfExists = this.getNodeParameter('updateIfExists', i) as boolean;
					if (updateIfExists === true) {
						endpoint = '/api/3/contact/sync';
					} else {
						endpoint = '/api/3/contacts';
					}

					dataKey = 'contact';
					body.contact = {
						email: this.getNodeParameter('email', i) as string,
					} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body.contact as IDataObject, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         contact:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const contactId = this.getNodeParameter('contactId', i) as number;
					endpoint = `/api/3/contacts/${contactId}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         contact:get
					// ----------------------------------

					requestMethod = 'GET';

					const contactId = this.getNodeParameter('contactId', i) as number;
					endpoint = `/api/3/contacts/${contactId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         contacts:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					dataKey = 'contacts';
					endpoint = `/api/3/contacts`;

				} else if (operation === 'update') {
					// ----------------------------------
					//         contact:update
					// ----------------------------------

					requestMethod = 'PUT';

					const contactId = this.getNodeParameter('contactId', i) as number;
					endpoint = `/api/3/contacts/${contactId}`;

					dataKey = 'contact';
					body.contact = {} as IDataObject;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body.contact as IDataObject, updateFields);

				} else {
					throw new Error(`The operation "${operation}" is not known`);
				}
			} else if (resource === 'deal') {
				if (operation === 'create') {
					// ----------------------------------
					//         deal:create
					// ----------------------------------

					requestMethod = 'POST';

					endpoint = '/api/3/deals';

					dataKey = 'deal';

					body.deal = {
						title: this.getNodeParameter('title', i) as string,
						contact: this.getNodeParameter('contact', i) as string,
						value: this.getNodeParameter('value', i) as number,
					} as IDataObject;

					const group = this.getNodeParameter('owner', i) as string
					if (group !== '') {
						addAdditionalFields(body.deal as IDataObject, { group })
					}

					const owner = this.getNodeParameter('owner', i) as string
					if (owner !== '') {
						addAdditionalFields(body.deal as IDataObject, { owner })
					}

					const stage = this.getNodeParameter('stage', i) as string
					if (stage !== '') {
						addAdditionalFields(body.deal as IDataObject, { stage })
					}

					const currency = this.getNodeParameter('currency', i) as string
					addAdditionalFields(body.deal as IDataObject, { currency })

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body.deal as IDataObject, additionalFields);

				} else if (operation === 'update') {
					// ----------------------------------
					//         deal:update
					// ----------------------------------

					requestMethod = 'PUT';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/api/3/deals/${dealId}`;

					dataKey = 'deal';
					body.deal = {} as IDataObject;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body.deal as IDataObject, updateFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         deal:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/api/3/deals/${dealId}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         deal:get
					// ----------------------------------

					requestMethod = 'GET';

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/api/3/deals/${dealId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         deals:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					dataKey = 'deals';
					endpoint = `/api/3/deals`;

				} else if (operation === 'createNote') {
					// ----------------------------------
					//         deal:createNote
					// ----------------------------------
					requestMethod = 'POST'

					body.note = {
						note: this.getNodeParameter('dealNote', i) as string,
					} as IDataObject

					const dealId = this.getNodeParameter('dealId', i) as number;
					endpoint = `/api/3/deals/${dealId}/notes`;

				} else if (operation === 'updateNote') {
					// ----------------------------------
					//         deal:updateNote
					// ----------------------------------
					requestMethod = 'PUT'

					body.note = {
						note: this.getNodeParameter('dealNote', i) as string,
					} as IDataObject

					const dealId = this.getNodeParameter('dealId', i) as number;
					const dealNoteId = this.getNodeParameter('dealNoteId', i) as number;
					endpoint = `/api/3/deals/${dealId}/notes/${dealNoteId}`;


				} else {
					throw new Error(`The operation "${operation}" is not known`);
				}

			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			let responseData;
			if (returnAll === true) {
				responseData = await activeCampaignApiRequestAllItems.call(this, requestMethod, endpoint, body, qs, dataKey);
			} else {
				responseData = await activeCampaignApiRequest.call(this, requestMethod, endpoint, body, qs, dataKey);
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}


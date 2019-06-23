import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	NodeParameterValue,
} from 'n8n-workflow';

import * as requestPromise from 'request-promise-native';

interface CustomProperty {
	name: string;
	value: string;
}

interface FilterValue {
	operation: string;
	value: NodeParameterValue;
}
interface FilterValues {
	[key: string]: FilterValue[];
}


export class Chargebee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chargebee',
		name: 'chargebee',
		icon: 'file:chargebee.png',
		group: ['input'],
		version: 1,
		description: 'Retrieve data from Chargebee API',
		defaults: {
			name: 'Chargebee',
			color: '#22BB11',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'chargebeeApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				default: 'listInvoices',
				description: 'The operation to perform.',
				type: 'options',
				options: [
					{
						name: 'Cancel Subscription',
						value: 'cancelSubscription',
						description: 'Cancel a subscription',
					},
					{
						name: 'Create Customer',
						value: 'createCustomer',
						description: 'Create a customer',
					},
					{
						name: 'Delete Subscription',
						value: 'deleteSubscription',
						description: 'Deletes a subscription',
					},
					{
						name: 'List Invoices',
						value: 'listInvoices',
						description: 'Returns the invoices',
					},
					{
						name: 'PDF Invoice URL',
						value: 'pdfInvoiceUrl',
						description: 'Gets PDF invoice URL and adds it as property "pdfUrl"',
					},
				],
			},


			// ----------------------------------
			//         cancelSubscription
			// ----------------------------------
			{
				displayName: 'Subscription Id',
				name: 'subscriptionId',
				description: 'The id of the subscription to cancel.',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'cancelSubscription'
						],
					},
				},
			},
			{
				displayName: 'Schedule end of Term',
				name: 'endOfTerm',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: [
							'cancelSubscription'
						],
					},
				},
				description: 'If set it will not cancel it directly in will instead schedule the cancelation for the end of the term..',
			},


			// ----------------------------------
			//         createCustomer
			// ----------------------------------
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'createCustomer'
						],
					},
				},
				default: {},
				description: 'Properties to set on the new user',
				placeholder: 'Add Property',
				options: [
					{
						displayName: 'User Id',
						name: 'id',
						type: 'string',
						default: '',
						description: 'Id for the new customer. If not given, this will be auto-generated.',
					},
					{
						displayName: 'First Name',
						name: 'first_name',
						type: 'string',
						default: '',
						description: 'The first name of the customer.',
					},
					{
						displayName: 'Last Name',
						name: 'last_name',
						type: 'string',
						default: '',
						description: 'The last name of the customer.',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						description: 'The email address of the customer.',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'The phone number of the customer.',
					},
					{
						displayName: 'Company',
						name: 'company',
						type: 'string',
						default: '',
						description: 'The company of the customer.',
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
					}


				],
			},


			// ----------------------------------
			//         deleteSubscription
			// ----------------------------------
			{
				displayName: 'Subscription Id',
				name: 'subscriptionId',
				description: 'The id of the subscription to delete.',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'deleteSubscription'
						],
					},
				},
			},


			// ----------------------------------
			//         pdfInvoiceUrl
			// ----------------------------------
			{
				displayName: 'Invoice Id',
				name: 'invoiceId',
				description: 'The id of the invoice to get.',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'pdfInvoiceUrl'
						],
					},
				},
			},


			// ----------------------------------
			//         listInvoices
			// ----------------------------------
			{
				displayName: 'Max results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 10,
				displayOptions: {
					show: {
						operation: [
							'listInvoices'
						],
					},
				},
				description: 'Max. amount of results to return(< 100).',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				placeholder: 'Add Filter',
				description: 'Filter for invoices.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						operation: [
							'listInvoices'
						],
					},
				},
				options: [
					{
						name: 'date',
						displayName: 'Invoice Date',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: 'Is',
										value: 'is'
									},
									{
										name: 'Is Not',
										value: 'is_not'
									},
									{
										name: 'After',
										value: 'after'
									},
									{
										name: 'Before',
										value: 'before'
									},

								],
								default: 'after',
								description: 'Operation to decide where the the data should be mapped to.',
							},
							{
								displayName: 'Date',
								name: 'value',
								type: 'dateTime',
								default: '',
								description: 'Query date.',
							},
						]
					},
					{
						name: 'total',
						displayName: 'Invoice Amount',
						values: [
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: 'Is',
										value: 'is'
									},
									{
										name: 'Is Not',
										value: 'is_not'
									},
									{
										name: 'Greater than',
										value: 'gt'
									},
									{
										name: 'Greater equal than',
										value: 'gte'
									},
									{
										name: 'Less than',
										value: 'lt'
									},
									{
										name: 'Less equal than',
										value: 'lte'
									},
								],
								default: 'gt',
								description: 'Operation to decide where the the data should be mapped to.',
							},
							{
								displayName: 'Amount',
								name: 'value',
								type: 'number',
								typeOptions: {
									numberPrecision: 2,
								},
								default: 0,
								description: 'Query amount.',
							},
						]
					},
				],
			},
		],
	};



	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let item: INodeExecutionData;

		const credentials = this.getCredentials('chargebeeApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const baseUrl = `https://${credentials.accountName}.chargebee.com/api/v2`;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {

			item = items[i];
			const operation = this.getNodeParameter('operation', i) as string;

			let requestMethod = 'GET';
			let endpoint = '';
			body = {};
			qs = {};

			if (operation === 'cancelSubscription') {
				requestMethod = 'POST';

				const subscriptionId = this.getNodeParameter('subscriptionId', i, {}) as string;
				body.end_of_term = this.getNodeParameter('endOfTerm', i, {}) as boolean;

				endpoint = `subscriptions/${subscriptionId.trim()}/cancel`;
			} else if (operation === 'createCustomer') {
				requestMethod = 'POST';

				const properties = this.getNodeParameter('properties', i, {}) as IDataObject;

				for (const key of Object.keys(properties)) {
					if (key === 'customProperties' && (properties.customProperties as IDataObject).property !== undefined) {
						for (const customProperty of (properties.customProperties as IDataObject)!.property! as CustomProperty[]) {
							qs[customProperty.name] = customProperty.value;
						}
					} else {
						qs[key] = properties[key];
					}
				}

				endpoint = `customers`;
			} else if (operation === 'deleteSubscription') {
				requestMethod = 'POST';

				const subscriptionId = this.getNodeParameter('subscriptionId', i, {}) as string;

				endpoint = `subscriptions/${subscriptionId.trim()}/delete`;
			} else if (operation === 'listInvoices') {
				endpoint = 'invoices';
				// TODO: Make also sorting configurable
				qs['sort_by[desc]'] = 'date';

				qs.limit = this.getNodeParameter('maxResults', i, {});

				const setFilters: FilterValues = this.getNodeParameter('filters', i, {}) as unknown as FilterValues;

				let filter: FilterValue;
				let value: NodeParameterValue;

				for (const filterProperty of Object.keys(setFilters)) {
					for (filter of setFilters[filterProperty]) {
						value = filter.value;
						if (filterProperty === 'date') {
							value = Math.floor(new Date(value as string).getTime() / 1000);
						}
						qs[`${filterProperty}[${filter.operation}]`] = value;
					}
				}

			} else if (operation === 'pdfInvoiceUrl') {
				requestMethod = 'POST';
				const invoiceId = this.getNodeParameter('invoiceId', i) as string;
				endpoint = `invoices/${invoiceId.trim()}/pdf`;
			}

			const options = {
				method: requestMethod,
				body,
				qs,
				uri: `${baseUrl}/${endpoint}`,
				auth: {
					user: credentials.apiKey as string,
					pass: '',
				},
				json: true
			};

			const responseData = await requestPromise(options);

			if (operation === 'listInvoices') {
				responseData.list.forEach((data: IDataObject) => {
					returnData.push(data.invoice as IDataObject);
				});
			} else if (operation === 'pdfInvoiceUrl') {
				item.json.pdfUrl = responseData.download.download_url;
				returnData.push(item.json);
			} else {
				returnData.push(responseData);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

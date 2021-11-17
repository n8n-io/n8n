import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiCall,
} from './GenericFunctions';

import {
	contactFields,
	contactOperations,
} from './ContactDescription';

import {
	transactionFields,
	transactionOperations,
} from './TransactionDescription';

import {
	additionalData
} from './AdditionalInfo';

var querystring = require('querystring');
var request = require("request")
import FormData = require('form-data');

export class Akaunting implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Akaunting (Beta)',
		name: 'akaunting',
		icon: 'file:akaunting.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Akaunting API',
		defaults: {
			name: 'Akaunting',
			color: '#6DA252',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'akauntingApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Payment',
						value: 'payment',
					},
					{
						name: 'Revenue',
						value: 'revenue',
					},
					{
						name: 'Vendor',
						value: 'vendor',
					},
					{
						name: 'Customer',
						value: 'customer',
					},
				],
				default: 'payment',
				description: 'The resource to operate on.',
			},
			...transactionOperations,
			...transactionFields,
			...contactOperations,
			...contactFields,
			...additionalData,
		],
	};

	methods = {
		loadOptions: {
			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const credentials = await this.getCredentials('akauntingApi') as {
					url: string;
					company_id: string;
					username: string;
					password: string;
				};

				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

				let body = new FormData()
				body.append("company_id", credentials.company_id)
				body.append("page", 1)
				body.append("limit", 100)

				const accounts = await apiCall.call(this, {}, 'GET', "/api/accounts", {}, body);

				for (const account of accounts.data) {
					returnData.push({
						name: account.name,
						value: account.id,
					});
				}
				returnData.sort((a, b) => {
					if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) { return -1; }
					if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) { return 1; }
					return 0;
				});
				return returnData;
			},

			async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const credentials = await this.getCredentials('akauntingApi') as {
					url: string;
					company_id: string;
					username: string;
					password: string;
				};

				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

				let body = new FormData()
				body.append("company_id", credentials.company_id)
				body.append("page", 1)
				body.append("limit", 100)

				const categories = await apiCall.call(this, {}, 'GET', "/api/categories", {}, body);

				let resource = this.getCurrentNodeParameter('resource') as string;
				for (const category of categories.data) {
					if (resource == "payment" && category.type == "expense") {
						returnData.push({
							name: category.name,
							value: category.id,
						});
					}
					else if (resource == "revenue" && category.type == "income") {
						returnData.push({
							name: category.name,
							value: category.id,
						});
					}


				}
				returnData.sort((a, b) => {
					if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) { return -1; }
					if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) { return 1; }
					return 0;
				});
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('akauntingApi') as {
			url: string;
			company_id: string;
			username: string;
			password: string;
		};

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}
		const items = this.getInputData();
		const length = items.length as unknown as number;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < length; i++) {
			try {
				let resource = this.getNodeParameter('resource', i) as string;
				let operation = this.getNodeParameter('operation', i) as string;
				let responseData: IDataObject

				let body = new FormData()
				if (resource == "payment" || resource == "revenue") {
					if (operation == "create") {

						let account_id = this.getNodeParameter('account_id', i) as number
						let category_id = this.getNodeParameter('category_id', i) as number
						let paid_at = this.getNodeParameter('paid_at', i) as string
						let payment_method = this.getNodeParameter('payment_method', i) as string
						let amount = this.getNodeParameter('amount', i) as number
						let currency_code = this.getNodeParameter('currency_code', i) as string
						let currency_rate = this.getNodeParameter('currency_rate', i) as string
						const additional = this.getNodeParameter('additional', i) as IDataObject;

						body.append("company_id", credentials.company_id)
						body.append("account_id", account_id)
						body.append("category_id", category_id)
						body.append("paid_at", paid_at)
						body.append("payment_method", payment_method)
						body.append("amount", amount)
						body.append("currency_code", currency_code)
						body.append("currency_rate", currency_rate)


						if (additional.reference) {
							body.append("reference", additional.reference)
						}

						if (additional.contact_id) {
							body.append("contact_id", additional.contact_id)
						}

						if (additional.description) {
							body.append("description", additional.description)
						}

						if (additional.attachment) {
							body.append("attachment[0]", request(additional.attachment as string))
						}

						if (additional.category_id) {
							body.append("category_id", additional.category_id)
						}

						if (additional.contact_name) {
							body.append("contact_name", additional.contact_name)
						}

						const headers: {} = body.getHeaders()
						if (resource == "payment") {
							body.append("search", "type:expense")
							body.append("type", "expense")

							responseData = await apiCall.call(this, {}, "POST", "/api/transactions", {}, body)
						}
						else if (resource == "revenue") {
							body.append("search", "type:income")
							body.append("type", "income")

							responseData = await apiCall.call(this, {}, "POST", "/api/transactions", {}, body);
						} else {
							throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
						}
					} else if (operation == "getAll") {
						if (resource == "payment") {
							const params = {
								company_id: credentials.company_id,
								search: "type:expense",
								page: 1,
								limit: 100
							}
							const qs = querystring.stringify(params)
							responseData = await apiCall.call(this, {}, "GET", "/api/transactions", qs, body)
						}
						else if (resource == "revenue") {
							const params = {
								company_id: credentials.company_id,
								search: "type:income",
								page: 1,
								limit: 100
							}
							const qs = querystring.stringify(params)
							responseData = await apiCall.call(this, {}, "GET", "/api/transactions", qs, body);
						} else {
							throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
						}
					}
					else {
						throw new NodeOperationError(this.getNode(), `The resource "${operation}" is not known!`);
					}

					returnData.push(responseData as IDataObject)
				}

				if (resource == "vendor" || resource == "customer") {

					if (operation == "create") {
						if (resource == "vendor") {
							body.append("search", "type:vendor")
						}
						else if (resource == "customer") {
							body.append("search", "type:customer")
						} else {
							throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
						}
						body.append("company_id", credentials.company_id)
						let name = this.getNodeParameter('contact_name', i) as number
						body.append("name", name)
						responseData = await apiCall.call(this, {}, "POST", "/api/contacts", {}, body)
						returnData.push(responseData as IDataObject)
					}
					else if (operation == "getAll") {
						let params = {}
						if (resource == "vendor") {
							params = {
								company_id: credentials.company_id,
								search: "type:vendor",
								page: 1,
								limit: 100
							}
						}
						else if (resource == "customer") {
							params = {
								company_id: credentials.company_id,
								search: "type:customer",
								page: 1,
								limit: 100
							}
						}
						else {
							throw new NodeOperationError(this.getNode(), `The resource "${operation}" is not known!`);
						}
						const qs = querystring.stringify(params)
						console.log(qs)
						responseData = await apiCall.call(this, {}, "GET", "/api/contacts", qs, body)
						returnData.push(responseData as IDataObject)

					}
				}
			}
			catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

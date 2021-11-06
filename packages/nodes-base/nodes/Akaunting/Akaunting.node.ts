import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiCall,
} from './GenericFunctions';

import {
	additionalData
} from './AdditionalInfo'

var request = require("request")
import FormData = require('form-data');

export class Akaunting implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Akaunting',
		name: 'akaunting',
		icon: 'file:akaunting.png',
		group: ['transform'],
		version: 1,
		description: 'Custom Nodes Akaunting API',
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
			required : true,
			options: [
			{
				name: 'Create Payment',
				value: 'create_payment',
			},
			{
				name: 'Create Revenue',
				value: 'create_revenue',
			},
			],
			default: 'create_payment',
			description: 'The resource to operate on.',
		},
		{
			displayName: 'Account ID',
			name: 'account_id',
			type: 'string' ,
			default: '',
			placeholder: '1',
			required: true,
			displayOptions: {
				show: {
					resource: [
					'create_payment',
					'create_revenue',
					],
				},
			},
			description: 'Account ID',
		},
		{
			displayName: 'Category ID',
			name: 'category_id',
			type: 'string',
			default: '',
			placeholder : "1",
			required: true,
			displayOptions: {
				show: {
					resource: [
					'create_payment',
					'create_revenue',
					],
				},
			},
			description: 'Category ID',
		},
		{
			displayName: 'Paid Date',
			name: 'paid_at',
			type: 'string' ,
			default: '',
			placeholder: "2021-04-15 13:25:53",
			required: true,
			displayOptions: {
				show: {
					resource: [
					'create_revenue',
					'create_payment',
					],
				},
			},
			description: 'Paid Date',
		},
		{
			displayName: 'Amount',
			name: 'amount',
			type: 'string' ,
			default: '',
			placeholder: "10",
			required: true,
			displayOptions: {
				show: {
					resource: [
					'create_payment',
					'create_revenue',
					],
				},
			},
			description: 'Amount',
		},
		{
			displayName: 'Currency Code',
			name: 'currency_code',
			type: 'string' ,
			default: '',
			placeholder: "USD",
			required: true,
			displayOptions: {
				show: {
					resource: [
					'create_payment',
					'create_revenue',
					],
				},
			},
			description: 'Currency Code',
		},
		{
			displayName: 'Currency Rate',
			name: 'currency_rate',
			type: 'string' ,
			default: '',
			placeholder: "1",
			required: true,
			displayOptions: {
				show: {
					resource: [
					'create_payment',
					'create_revenue',
					],
				},
			},
			description: 'Currency Rate',
		},
		{
			displayName: 'Payment Method',
			name: 'payment_method',
			type: 'string' ,
			default: '',
			placeholder: "cash",
			required: true,
			displayOptions: {
				show: {
					resource: [
					'create_revenue',
					'create_payment',
					],
				},
			},
			description: 'Reference Payment',
		},
		...additionalData
		],
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
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try{
				// For Post
				let resource = this.getNodeParameter('resource', i) as string;
				let responseData : IDataObject

				let account_id = this.getNodeParameter('account_id', i) as number
				let category_id = this.getNodeParameter('category_id', i) as number
				let paid_at = this.getNodeParameter('paid_at', i) as string
				let payment_method = this.getNodeParameter('payment_method', i) as string
				let amount = this.getNodeParameter('amount', i) as number
				let currency_code = this.getNodeParameter('currency_code', i) as string
				let currency_rate = this.getNodeParameter('currency_rate', i) as string
				const additional = this.getNodeParameter('additional', i) as IDataObject;

				let body = new FormData()
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

				if(resource=="create_payment"){
					body.append("search","type:expense")
					body.append("type","expense")

					responseData = await apiCall.call(this, {}, "POST", "/api/transactions", {}, body)
				}else if(resource=="create_revenue"){
					body.append("search","type:income")
					body.append("type", "income")

					responseData = await apiCall.call(this, {}, "POST", "/api/transactions", {}, body);
				}else{
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
				}
				returnData.push(responseData as IDataObject);
			} catch (error) {
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

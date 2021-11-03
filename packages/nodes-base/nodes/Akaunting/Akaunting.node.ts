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
	apiCall
} from './GenericFunctions';

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
					type: 'number' ,
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
					type: 'number',
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
					displayName: 'Contact ID',
					name: 'contact_id',
					type: 'number',
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
					description: 'Contact ID',
			},
			{
					displayName: 'Paid Date',
					name: 'paid_at',
					type: 'string' ,
					default: '',
					placeholder: "2021-04-15",
					required: true,
					displayOptions: {
							show: {
									resource: [
									'create_revenue',
									'create_payment',
									],
							},
					},
					description: 'Text to Upload',
			},
			{
					displayName: 'Reference',
					name: 'reference',
					type: 'string' ,
					default: '',
					placeholder: "456tfd4",
					required: false,
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
			}],
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

							if(resource=="create_payment"){
									let account_id = this.getNodeParameter('account_id', i) as number
									let category_id = this.getNodeParameter('category_id', i) as number
									let contact_id = this.getNodeParameter('contact_id', i) as number
									let paid_at = this.getNodeParameter('paid_at', i) as string
									let reference = this.getNodeParameter('reference', i) as string
									let payment_method = this.getNodeParameter('payment_method', i) as string

									let qs : IDataObject = {
										company_id : credentials.company_id,
										search : "type:expense",
										account_id,
										category_id,
										contact_id,
										paid_at,
										reference,
										payment_method,
										type : "expense"
									}
									responseData = await apiCall.call(this, "POST", "/api/transactions", qs, {});
							}else if(resource=="create_revenue"){
								let account_id = this.getNodeParameter('account_id', i) as number
								let category_id = this.getNodeParameter('category_id', i) as number
								let contact_id = this.getNodeParameter('contact_id', i) as number
								let paid_at = this.getNodeParameter('paid_at', i) as string
								let reference = this.getNodeParameter('reference', i) as string
								let payment_method = this.getNodeParameter('payment_method', i) as string

								let qs : IDataObject = {
									company_id : credentials.company_id,
									search : "type:income",
									account_id,
									category_id,
									contact_id,
									paid_at,
									reference,
									payment_method,
									type : "income"
								}
								responseData = await apiCall.call(this, "POST", "/api/transactions", qs, {});
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

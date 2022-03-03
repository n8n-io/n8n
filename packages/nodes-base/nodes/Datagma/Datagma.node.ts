import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export class Datagma implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Datagma',
		name: 'datagma',
		icon: 'file:datagma.png',
		group: ['transform'],
		version: 1,
		description: 'Consume Datagma API',
		defaults: {
				name: 'Datagma',
				color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'datagmaApi',
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
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
				required: true,
				description: 'Resource to consume',
			},
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
						name: 'Find',
						value: 'get',
						description: 'Find email',
					},
					{
						name: 'Enrich',
						value: 'enrich',
						description: 'Enrich contact'
					}
				],
				default: 'enrich',
				description: 'The operation to perform.',
			},
			{
				displayName: 'First Name',
				name: 'fname',
				type: 'string',
				required: false,
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
				default:'',
				description:'First name of associated person. Alternatively, use full name field.',
			},
			{
				displayName: 'Last Name',
				name: 'lname',
				type: 'string',
				required: false,
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
				default:'',
				description:'Last name of associated person. Alternatively, use full name field.',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				required: true,
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
				default:'',
				description:'Company name of the associated person.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
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
				options: [
					{
						displayName: 'Full Name',
						name: 'fullName',
						type: 'string',
						default:'',
						description:'If first name and last name are not provided, you can specify a full name here.',
					},
				],
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				required: true,
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
				default:'',
				description:'Company name of the associated person.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('datagmaApi') as IDataObject;

		for (let i = 0; i < items.length; i++) {
			if (resource === 'contact') {
				if (operation === 'get') {
					// get inputs
					const fname = this.getNodeParameter('fname', i) as string;
					const lname = this.getNodeParameter('lname', i) as string;
					const company = this.getNodeParameter('company', i) as string;
					// get additional fields input
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					// // ?looks like merging some data here?
					// const data: IDataObject = {
					// 	fname,
					// 	lname,
					// 	company,
					// };

					// Object.assign(data, additionalFields);

					//Make http request according to <https://doc.datagma.com/reference>
					const options: OptionsWithUri = {
						headers: {
							'Accept': 'application/json',
						},
						method: 'GET',
						qs: {
							apiId: credentials.apiKey,
							firstName: fname,
							lastName: lname,
							fullName: additionalFields.fullName,
							company: company
						},
						uri: `https://gateway.datagma.net/api/ingress/v2/findEmail`,
						json: true,
					};

					responseData = await this.helpers.request(options);
					returnData.push(responseData);
				}
			}
		}
		// Map data to n8n data
		return [this.helpers.returnJsonArray(returnData)];
	}
}

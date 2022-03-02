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
						name: 'Email',
						value: 'email',
					},
				],
				default: 'email',
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
							'email',
						],
					},
				},
				options: [
					{
						name: 'Find',
						value: 'find',
						description: 'Find email',
					},
				],
				default: 'find',
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
							'find',
						],
						resource: [
							'email',
						],
					},
				},
				default:'',
				description:'First name',
			},
			{
				displayName: 'Last Name',
				name: 'lname',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'find',
						],
						resource: [
							'email',
						],
					},
				},
				default:'',
				description:'Last name',
			},
			{
				displayName: 'Full Name',
				name: 'fullName',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'find',
						],
						resource: [
							'email',
						],
					},
				},
				default:'',
				description:'Instead of input firstname, lastname. You can input full name here',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'find',
						],
						resource: [
							'email',
						],
					},
				},
				default:'',
				description:'Company name',
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
							'find',
						],
						resource: [
							'email',
						],
					},
				},
				options: [
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('datagmaApi') as IDataObject;

		if (resource === 'email') {
			if (operation === 'find') {
				// get email input
				const fname = this.getNodeParameter('fname', 0) as string;
				const lname = this.getNodeParameter('lname', 0) as string;
				const fullName = this.getNodeParameter('fullName', 0) as string;
				const company = this.getNodeParameter('company', 0) as string;
				// get additional fields input
				const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const data: IDataObject = {
					fname,
					lname,
					fullName,
					company,
				};

				Object.assign(data, additionalFields);

				//Make http request according to <https://doc.datagma.com/reference/ingressservice_findemailv2>
				const options: OptionsWithUri = {
					headers: {
						'Accept': 'application/json',
					},
					method: 'GET',
					qs: {
						apiId: credentials.apiKey,
						firstName: fname,
						lastName: lname,
						fullName: fullName,
						company: company
					},
					uri: `https://gateway.datagma.net/api/ingress/v2/findEmail`,
					json: true,
				};

				responseData = await this.helpers.request(options);
			}
		}

		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
	}
}

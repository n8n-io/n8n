import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import {
	dropcontactApiRequest,
} from './GenericFunction';

export class Dropcontact implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dropcontact',
		name: 'dropcontact',
		icon: 'file:dropcontact.svg',
		group: ['transform'],
		version: 1,
		description: 'Find B2B emails and enrich contacts',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Dropcontact',
			color: '#0ABA9F',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'dropcontactApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				noDataExpression: true,
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Enrich Contact',
						value: 'enrichContact',
						description: 'Find B2B emails and enrich your contact from his name and his website',
					},
				],
				default: 'enrichContact',
				required: true,
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Siren',
				name: 'siren',
				type: 'boolean',
				required: true,
				default: false,
				description: 'Whether you want the SIREN number, NAF code, TVA number, company address and informations about the company leader',
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				required: true,
				default: true,
				description: `By default, the API response only includes the 'request_id'.</br>
				When 'Resolve Data' is set to true, a second request is made to retrieve the contact information using the request_id`,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Company\'s SIREN Number',
						name: 'num_siren',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Company\'s SIRET',
						name: 'siret',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Contact\'s Company Name',
						name: 'company',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
					},
					{
						displayName: 'First Name',
						name: 'first_name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Full Name',
						name: 'full_name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{
								name: 'English',
								value: 'en',
							},
							{
								name: 'French',
								value: 'fr',
							},
						],
						default: 'en',
						description: 'Whether the response is in English or French',
					},
					{
						displayName: 'Last Name',
						name: 'last_name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'LinkedIn Profile',
						name: 'linkedin',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Phone Number',
						name: 'phone',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Website',
						name: 'website',
						type: 'string',
						default: '',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{
								name: 'English',
								value: 'en',
							},
							{
								name: 'French',
								value: 'fr',
							},
						],
						default: 'en',
						description: 'Whether the response is in English or French',
					},
					{
						displayName: 'Wait Time (Seconds)',
						name: 'waitTime',
						type: 'number',
						displayOptions: {
							show: {
								'/resolveData': [
									true,
								],
							},
						},
						default: 10,
						description: 'Time (in seconds) the node waits before requesting the contact information using the request_id',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const entryData = this.getInputData();
		const resource = this.getNodeParameter('operation', 0) as string;
		let responseData;

		if (resource === 'enrichContact') {
			const resolveData = this.getNodeParameter('resolveData', 0) as boolean;
			const options = this.getNodeParameter('options', 0) as IDataObject;
			const data = [];
			for (let i = 0; i < entryData.length; i++) {
				const email = this.getNodeParameter('email', i) as string;
				const siren = this.getNodeParameter('siren', i) as boolean;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IDataObject = {
					siren,
					laguange: 'en',
				};
				if (email !== '') {
					body.email = email;
				}
				Object.assign(body, additionalFields);
				if (options.language) {
					body.language = options.language;
				}
				data.push(body);
			}

			responseData = await dropcontactApiRequest.call(this, 'POST', '/batch', { data }, {});

			if (this.continueOnFail()) {
				if (responseData.error || responseData.success === false) {
					throw new NodeApiError(this.getNode(), { error: 'invalid request' });
				}
			}

			if (resolveData) {
				const waitTime = this.getNodeParameter('options.waitTime', 0, 0) as number;
				const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
				await delay((waitTime || 10) * 1000);
				responseData = await dropcontactApiRequest.call(this, 'GET', `/batch/${responseData.request_id}`, {}, {});
				if (!responseData.success) {
					throw new NodeApiError(this.getNode(), {}, {
						message: responseData.reason,
						description: 'Hint: Increase the wait time under options',
					});
				}
				responseData = responseData.data;
			}
		}

		return [this.helpers.returnJsonArray(responseData as IDataObject)];
	}
}

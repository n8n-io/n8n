import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import {
	dropcontactApiRequest,
	validateCrendetials,
} from './GenericFunction';

export class Dropcontact implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dropcontact',
		name: 'dropcontact',
		icon: 'file:dropcontact.svg',
		group: ['transform'],
		version: 1,
		description: 'Find B2B emails and enrich contacts',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Dropcontact',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'dropcontactApi',
				required: true,
				testedBy: 'dropcontactApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				noDataExpression: true,
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
			},
			{
				displayName: 'Operation',
				noDataExpression: true,
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Enrich',
						value: 'enrich',
						description: 'Find B2B emails and enrich your contact from his name and his website',
					},
					{
						name: 'Fetch Request',
						value: 'fetchRequest',
					},
				],
				default: 'enrich',
				required: true,
			},
			{
				displayName: 'Request ID',
				name: 'requestId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
						operation: [
							'fetchRequest',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
						operation: [
							'enrich',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Simplify Output (Faster)',
				name: 'simplify',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
						operation: [
							'enrich',
						],
					},
				},
				default: false,
				description: 'When off, waits for the contact data before completing. Waiting time can be adjusted with Extend Wait Time option. When on, returns a request_id that can be used later in the Fetch Request operation.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
						operation: [
							'enrich',
						],
					},
				},
				options: [
					{
						displayName: 'Company SIREN Number',
						name: 'num_siren',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Company SIRET Code',
						name: 'siret',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Company Name',
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
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
						operation: [
							'enrich',
						],
					},
				},
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Data Fetch Wait Time',
						name: 'waitTime',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						displayOptions: {
							show: {
								'/simplify': [
									false,
								],
							},
						},
						default: 45,
						description: 'When not simplifying the response, data will be fetched in two steps. This parameter controls how long to wait (in seconds) before trying the second step',
					},
					{
						displayName: 'French Company Enrich',
						name: 'siren',
						type: 'boolean',
						default: false,
						description: `Whether you want the <a href="https://en.wikipedia.org/wiki/SIREN_code" target="_blank">SIREN number</a>, NAF code, TVA number, company address and informations about the company leader. Only applies to french companies`,
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
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async dropcontactApiCredentialTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				try {
					await validateCrendetials.call(this, credential.data as ICredentialDataDecryptedObject);
				} catch (error) {
					return {
						status: 'Error',
						message: 'The API Key included in the request is invalid',
					};
				}

				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const entryData = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		// tslint:disable-next-line: no-any
		let responseData: any;
		const returnData: IDataObject[] = [];

		if (resource === 'contact') {
			if (operation === 'enrich') {
				const options = this.getNodeParameter('options', 0) as IDataObject;
				const data = [];
				const simplify = this.getNodeParameter('simplify', 0) as boolean;

				const siren = options.siren === true ? true : false;
				const language = options.language ? options.language : 'en';

				for (let i = 0; i < entryData.length; i++) {
					const email = this.getNodeParameter('email', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i);
					const body: IDataObject = {};
					if (email !== '') {
						body.email = email;
					}
					Object.assign(body, additionalFields);
					data.push(body);
				}

				responseData = await dropcontactApiRequest.call(this, 'POST', '/batch', { data, siren, language }, {}) as { request_id: string, error: string, success: boolean };

				if (!responseData.success) {
					if (this.continueOnFail()) {
						returnData.push({ error: responseData.reason || 'invalid request' });
					} else {
						throw new NodeApiError(this.getNode(), { error: responseData.reason || 'invalid request' });
					}
				}

				if (simplify === false) {
					const waitTime = this.getNodeParameter('options.waitTime', 0, 45) as number;
					// tslint:disable-next-line: no-any
					const delay = (ms: any) => new Promise(res => setTimeout(res, ms * 1000));
					await delay(waitTime);
					responseData = await dropcontactApiRequest.call(this, 'GET', `/batch/${responseData.request_id}`, {}, {});
					if (!responseData.success) {
						if (this.continueOnFail()) {
							responseData.push({ error: responseData.reason });
						} else {
							throw new NodeApiError(this.getNode(), {
								error: responseData.reason,
								description: 'Hint: Increase the Wait Time to avoid this error',
							});
						}
					} else {
						returnData.push(...responseData.data);
					}
				} else {
					returnData.push(responseData);
				}
			}

			if (operation === 'fetchRequest') {
				for (let i = 0; i < entryData.length; i++) {
					const requestId = this.getNodeParameter('requestId', i) as string;
					responseData = await dropcontactApiRequest.call(this, 'GET', `/batch/${requestId}`, {}, {}) as { request_id: string, error: string, success: boolean };
					if (!responseData.success) {
						if (this.continueOnFail()) {
							responseData.push({ error: responseData.reason || 'invalid request' });
						} else {
							throw new NodeApiError(this.getNode(), { error: responseData.reason || 'invalid request' });
						}
					}
					returnData.push(...responseData.data);
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

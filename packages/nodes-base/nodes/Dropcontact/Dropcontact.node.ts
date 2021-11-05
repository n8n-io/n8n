import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeCredentialTestResult,
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
			color: '#0ABA9F',
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
						displayName: 'French Company Enrich',
						name: 'siren',
						type: 'boolean',
						default: false,
						description: `Whether you want the <a href="https://en.wikipedia.org/wiki/SIREN_code" target="_blank">SIREN number</a>, NAF code, TVA number, company address and informations about the company leader.</br>
						Only applies to french companies.`,
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
						displayName: 'Wait For Enriched Data',
						name: 'wait',
						type: 'boolean',
						default: true,
						description: `Wait for the contact to be enriched before returning.<br />
				If after three tries the contact is not ready, an error will be thrown.<br />
				Number of tries can be increased by setting "Wait Max Tries".`,
					},
					{
						displayName: 'Wait Max Tries',
						name: 'maxTries',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 10,
						},
						displayOptions: {
							show: {
								wait: [
									true,
								],
							},
						},
						default: 3,
						description: `How often it should check if the enriched data is available before it fails`,
					},
					{
						displayName: 'Wait Time',
						name: 'waitTime',
						type: 'number',
						displayOptions: {
							show: {
								wait: [
									true,
								],
							},
						},
						default: 45,
						description: 'Time (in seconds) the node waits until trying to retrieve the enriched data',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async dropcontactApiCredentialTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<NodeCredentialTestResult> {
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

		if (resource === 'contact') {
			if (operation === 'enrich') {
				const options = this.getNodeParameter('options', 0) as IDataObject;
				const data = [];
				for (let i = 0; i < entryData.length; i++) {
					const email = this.getNodeParameter('email', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i);
					const body: IDataObject = {
						siren: false,
						laguange: 'en',
					};
					if (email !== '') {
						body.email = email;
					}
					Object.assign(body, additionalFields);
					if (options.language) {
						body.language = options.language;
					}
					if (options.siren) {
						body.siren = options.siren;
					}
					data.push(body);
				}

				responseData = await dropcontactApiRequest.call(this, 'POST', '/batch', { data }, {}) as { request_id: string, error: string, success: boolean };

				if (!responseData.success) {
					if (this.continueOnFail()) {
						responseData.push({ error: responseData.reason || 'invalid request' });
					} else {
						throw new NodeApiError(this.getNode(), { error: 'invalid request' });
					}
				}

				let wait = true;

				if (options.hasOwnProperty('wait')) {
					wait = options.wait as boolean;
				}

				if (wait) {
					const waitTime = this.getNodeParameter('options.waitTime', 0, 45) as number;
					let maxTries = this.getNodeParameter('options.maxTries', 0, 3) as number;
					const promise = (requestId: string) => {
						return new Promise((resolve, reject) => {
							const timeout = setInterval(async () => {
								responseData = await dropcontactApiRequest.call(this, 'GET', `/batch/${requestId}`, {}, {});
								if (responseData.hasOwnProperty('data')) {
									clearInterval(timeout);
									resolve(responseData);
								}
								if (--maxTries === 0) {
									clearInterval(timeout);
									reject(new NodeApiError(this.getNode(), {}, {
										message: responseData.reason,
										description: 'Hint: Increase the Max Tries or Wait Time to avoid this error',
									}));
								}
							}, waitTime * 1000);
						});
					};

					responseData = await promise(responseData.request_id);
					responseData = responseData.data;
				}
			}

			if (operation === 'fetchRequest') {
				responseData = [];
				for (let i = 0; i < entryData.length; i++) {
					const requestId = this.getNodeParameter('requestId', i) as string;
					responseData = await dropcontactApiRequest.call(this, 'GET', `/batch/${requestId}`, {}, {}) as { request_id: string, error: string, success: boolean };
					if (!responseData.success) {
						if (this.continueOnFail()) {
							responseData.push({ error: responseData.reason || 'invalid request' });
						} else {
							throw new NodeApiError(this.getNode(), { error: 'invalid request' });
						}
					}
					responseData.push(...responseData.data);
				}
			}
		}

		return [this.helpers.returnJsonArray(responseData as IDataObject)];
	}
}
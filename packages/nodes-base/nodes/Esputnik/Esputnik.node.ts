import { BINARY_ENCODING, IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

export class Esputnik implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Esputnik',
		name: 'Esputnik',
		icon: 'file:esputnik-logo.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Esputnik API',
		defaults: {
			name: 'Esputnik',
			color: '#1A82e2'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'esputnikApi',
				required: true
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send Email'
					}
				],
				default: 'send',
				description: 'The operation to perform.'
			},
			{
				displayName: 'To Email',
				name: 'toEmail',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['send']
					}
				},
				default: '',
				description: 'Email'
			},
			{
				displayName: 'From Name',
				name: 'fromName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['send']
					}
				},
				default: '',
				description: 'Only name without email!'
			},
			{
				displayName: 'Template Id',
				name: 'templateId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['send']
					}
				},
				default: '',
				description: 'Email template ID'
			},
			{
				displayName: 'Payload',
				name: 'payload',
				type: 'json',
				required: false,
				displayOptions: {
					show: {
						operation: ['send']
					}
				},
				default: '',
				description: 'Payload for template'
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData = {};
		const returnData = [];
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = this.getCredentials('esputnikApi') as IDataObject;

		for (let i = 0; i < items.length; i++) {
			if (operation === 'send') {
				const toEmail = this.getNodeParameter('toEmail', i) as string;
				const templateId = this.getNodeParameter('templateId', i) as string;
				const fromName = this.getNodeParameter('fromName', i) as string;
				const payload = (this.getNodeParameter('payload', i) as string) || '{}';
				const data: IDataObject = {
					recipients: [
						{
							locator: toEmail,
							jsonParam: JSON.parse(payload)
						}
					],
					email: true,
					allowUnconfirmed: true,
					fromName
				};

				const options: OptionsWithUri = {
					headers: {
						Accept: 'application/json',
						Authorization: `Basic ${Buffer.from(
							'n8n' + ':' + credentials.apiKey
						).toString(BINARY_ENCODING)}`
					},
					method: 'POST',
					body: {
						data
					},
					uri: `https://esputnik.com/api/v1/message/${templateId}/smartsend`,
					json: true
				};

				responseData = await this.helpers.request(options);
				returnData.push(responseData);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

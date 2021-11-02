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
	NodeCredentialTestResult,
} from 'n8n-workflow';

import {
	dhlApiRequest,
	validateCrendetials,
} from './GenericFunctions';

export class Dhl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DHL',
		name: 'Dhl',
		icon: 'file:dhl.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume DHL API',
		defaults: {
			name: 'DHL',
			color: '#fecc00',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'dhlApi',
				required: true,
				testedBy: 'dhlApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				options: [
					{
						name: 'Tracking',
						value: 'tracking',
					},
				],
				default: 'tracking',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'tracking',
						],
					},
				},
				options: [
					{
						name: 'Get Tracking Information',
						value: 'get',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Tracking Number',
				name: 'trackingNumber',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Recipient Postal Code',
						name: 'recipientPostalCode',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async dhlApiCredentialTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<NodeCredentialTestResult> {
				try {
					await validateCrendetials.call(this, credential.data as ICredentialDataDecryptedObject);
				} catch (error) {
					if (error.statusCode === 401) {
						return {
							status: 'Error',
							message: 'The API Key included in the request is invalid',
						};
					}
				}

				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		let qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'tracking') {
					if (operation === 'get') {

						const trackingNumber = this.getNodeParameter('trackingNumber', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						qs = {
							trackingNumber,
						};

						Object.assign(qs, options);

						responseData = await dhlApiRequest.call(this, 'GET', `/track/shipments`, {}, qs);

						returnData.push(...responseData.shipments);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.description });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

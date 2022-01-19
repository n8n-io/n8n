import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	cloudflareApiRequest,
	//venafiApiRequestAllItems,
} from './GenericFunctions';

import {
	certificateFields,
	certificateOperations,
} from './CertificateDescription';

export class Cloudflare implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudflare',
		name: 'cloudflare',
		icon: 'file:cloudflare.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Cloudflare API',
		defaults: {
			name: 'Cloudflare',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'cloudflareApi',
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
						name: 'Certificate',
						value: 'certificate',
					},
				],
				default: 'certificate',
				description: 'The resource to operate on.',
			},
			...certificateOperations,
			...certificateFields,
		],
	};

	methods = {
		loadOptions: {
			async getZones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { result: zones } = await cloudflareApiRequest.call(this, 'GET', '/zones');
				for (const zone of zones) {
					returnData.push({
						name: zone.name,
						value: zone.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {

			try {

				if (resource === 'certificate') {

					//https://api.cloudflare.com/#zone-level-authenticated-origin-pulls-upload-certificate
					if (operation === 'upload') {

						const zoneId = this.getNodeParameter('zoneId', i) as string;
						const certificate = this.getNodeParameter('certificate', i) as string;
						const privateKey = this.getNodeParameter('privateKey', i) as string;

						const body: IDataObject = {
							certificate,
							private_key: privateKey,
						};

						responseData = await cloudflareApiRequest.call(
							this,
							'POST',
							`/zones/${zoneId}/origin_tls_client_auth`,
							body,
							qs,
						);

						responseData = responseData.result;
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

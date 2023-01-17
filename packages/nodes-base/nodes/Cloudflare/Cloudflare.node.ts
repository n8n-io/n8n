import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { cloudflareApiRequest, cloudflareApiRequestAllItems } from './GenericFunctions';

import { zoneCertificateFields, zoneCertificateOperations } from './ZoneCertificateDescription';

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
				noDataExpression: true,
				options: [
					{
						name: 'Zone Certificate',
						value: 'zoneCertificate',
					},
				],
				default: 'zoneCertificate',
			},
			...zoneCertificateOperations,
			...zoneCertificateFields,
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
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'zoneCertificate') {
					//https://api.cloudflare.com/#zone-level-authenticated-origin-pulls-delete-certificate
					if (operation === 'delete') {
						const zoneId = this.getNodeParameter('zoneId', i) as string;
						const certificateId = this.getNodeParameter('certificateId', i) as string;

						responseData = await cloudflareApiRequest.call(
							this,
							'DELETE',
							`/zones/${zoneId}/origin_tls_client_auth/${certificateId}`,
							{},
						);
						responseData = responseData.result;
					}
					//https://api.cloudflare.com/#zone-level-authenticated-origin-pulls-get-certificate-details
					if (operation === 'get') {
						const zoneId = this.getNodeParameter('zoneId', i) as string;
						const certificateId = this.getNodeParameter('certificateId', i) as string;

						responseData = await cloudflareApiRequest.call(
							this,
							'GET',
							`/zones/${zoneId}/origin_tls_client_auth/${certificateId}`,
							{},
						);
						responseData = responseData.result;
					}
					//https://api.cloudflare.com/#zone-level-authenticated-origin-pulls-list-certificates
					if (operation === 'getMany') {
						const zoneId = this.getNodeParameter('zoneId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i, {});

						Object.assign(qs, filters);

						if (returnAll) {
							responseData = await cloudflareApiRequestAllItems.call(
								this,
								'result',
								'GET',
								`/zones/${zoneId}/origin_tls_client_auth`,
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i);
							Object.assign(qs, { per_page: limit });
							responseData = await cloudflareApiRequest.call(
								this,
								'GET',
								`/zones/${zoneId}/origin_tls_client_auth`,
								{},
								qs,
							);
							responseData = responseData.result;
						}
					}
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

				returnData.push(
					...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), {
						itemData: { item: i },
					}),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData as INodeExecutionData[]];
	}
}

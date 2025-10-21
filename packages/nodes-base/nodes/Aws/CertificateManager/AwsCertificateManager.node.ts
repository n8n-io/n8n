import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleCertificateManagerError } from './helpers/errorHandler';

import { certificateOperations, certificateFields } from './descriptions';

export class AwsCertificateManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Certificate Manager',
		name: 'awsCertificateManager',
		icon: 'file:certificatemanager.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Certificate Manager (ACM)',
		defaults: {
			name: 'AWS Certificate Manager',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Certificate',
						value: 'certificate',
					},
				],
				default: 'certificate',
			},
			...certificateOperations,
			...certificateFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				let response: IDataObject | IDataObject[];

				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

				if (Object.keys(additionalFields).length > 0) {
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.body) {
						requestOptions.body = {};
					}

					if (additionalFields.SubjectAlternativeNames && typeof additionalFields.SubjectAlternativeNames === 'string') {
						additionalFields.SubjectAlternativeNames = (additionalFields.SubjectAlternativeNames as string)
							.split(',')
							.map(s => s.trim());
					}

					if (additionalFields.CertificateStatuses && typeof additionalFields.CertificateStatuses === 'string') {
						additionalFields.CertificateStatuses = (additionalFields.CertificateStatuses as string)
							.split(',')
							.map(s => s.trim());
					}

					if (additionalFields.Tags && typeof additionalFields.Tags === 'string') {
						try {
							additionalFields.Tags = JSON.parse(additionalFields.Tags as string);
						} catch (error) {
							throw new Error('Tags must be valid JSON array');
						}
					}

					Object.assign(requestOptions.body, additionalFields);
				}

				if (resource === 'certificate' && operation === 'export') {
					const passphrase = this.getNodeParameter('passphrase', itemIndex) as string;
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.body) {
						requestOptions.body = {};
					}
					(requestOptions.body as IDataObject).Passphrase = Buffer.from(passphrase).toString('base64');
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleCertificateManagerError.call(this, response, itemIndex);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response as IDataObject[]),
					{ itemData: { item: itemIndex } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

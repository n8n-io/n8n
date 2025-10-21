import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleCloudFrontError } from './helpers/errorHandler';

import {
	distributionOperations,
	distributionFields,
	invalidationOperations,
	invalidationFields,
} from './descriptions';

export class AwsCloudFront implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS CloudFront',
		name: 'awsCloudFront',
		icon: 'file:cloudfront.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS CloudFront CDN service',
		defaults: {
			name: 'AWS CloudFront',
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
				'Content-Type': 'application/json',
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
						name: 'Distribution',
						value: 'distribution',
					},
					{
						name: 'Invalidation',
						value: 'invalidation',
					},
				],
				default: 'distribution',
			},
			...distributionOperations,
			...distributionFields,
			...invalidationOperations,
			...invalidationFields,
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
					
					if (operation === 'list') {
						if (!requestOptions.qs) {
							requestOptions.qs = {};
						}
						Object.assign(requestOptions.qs, additionalFields);
					}
				}

				if (resource === 'invalidation' && operation === 'create') {
					const paths = this.getNodeParameter('paths', itemIndex) as string;
					const callerReference = this.getNodeParameter('callerReference', itemIndex) as string;
					
					const pathArray = paths.split(',').map(p => p.trim());
					
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
					if (!requestOptions.body) {
						requestOptions.body = {};
					}
					(requestOptions.body as IDataObject).InvalidationBatch = {
						CallerReference: callerReference,
						Paths: {
							Quantity: pathArray.length,
							Items: pathArray,
						},
					};
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('Code' in response || 'Error' in response)) {
					await handleCloudFrontError.call(this, response, itemIndex);
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

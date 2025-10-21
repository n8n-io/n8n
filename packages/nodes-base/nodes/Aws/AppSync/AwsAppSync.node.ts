import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleAppSyncError } from './helpers/errorHandler';

import {
	apiOperations,
	apiFields,
	dataSourceOperations,
	dataSourceFields,
} from './descriptions';

export class AwsAppSync implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS AppSync',
		name: 'awsAppSync',
		icon: 'file:appsync.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS AppSync GraphQL API service',
		defaults: {
			name: 'AWS AppSync',
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
						name: 'API',
						value: 'api',
					},
					{
						name: 'Data Source',
						value: 'dataSource',
					},
				],
				default: 'api',
			},
			...apiOperations,
			...apiFields,
			...dataSourceOperations,
			...dataSourceFields,
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
					} else {
						if (!requestOptions.body) {
							requestOptions.body = {};
						}

						if (additionalFields.tags && typeof additionalFields.tags === 'string') {
							try {
								additionalFields.tags = JSON.parse(additionalFields.tags as string);
							} catch (error) {
								throw new Error('Tags must be valid JSON object');
							}
						}

						Object.assign(requestOptions.body, additionalFields);
					}
				}

				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleAppSyncError.call(this, response, itemIndex);
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

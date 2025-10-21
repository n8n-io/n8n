import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleIoTError } from './helpers/errorHandler';

import {
	thingOperations,
	thingFields,
	shadowOperations,
	shadowFields,
} from './descriptions';

export class AwsIoTCore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS IoT Core',
		name: 'awsIoTCore',
		icon: 'file:iot.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS IoT Core for device connectivity',
		defaults: {
			name: 'AWS IoT Core',
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
						name: 'Shadow',
						value: 'shadow',
					},
					{
						name: 'Thing',
						value: 'thing',
					},
				],
				default: 'thing',
			},
			...thingOperations,
			...thingFields,
			...shadowOperations,
			...shadowFields,
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

				// Handle additional fields
				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

				if (Object.keys(additionalFields).length > 0) {
					const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;

					// For GET requests, add to query parameters
					if (['list', 'get'].includes(operation)) {
						if (!requestOptions.qs) {
							requestOptions.qs = {};
						}
						Object.assign(requestOptions.qs, additionalFields);
					} else {
						// For PUT/PATCH/POST requests, add to body
						if (!requestOptions.body) {
							requestOptions.body = {};
						}

						// Parse JSON strings
						if (additionalFields.attributePayload && typeof additionalFields.attributePayload === 'string') {
							additionalFields.attributePayload = JSON.parse(additionalFields.attributePayload as string);
						}

						Object.assign(requestOptions.body, additionalFields);
					}
				}

				// Parse state JSON for shadow updates
				if (resource === 'shadow' && operation === 'update') {
					const state = this.getNodeParameter('state', itemIndex, '') as string;
					if (state) {
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}
						(requestOptions.body as IDataObject).state = JSON.parse(state);
					}
				}

				// Make the request using n8n's routing
				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				// Handle errors
				if (response && typeof response === 'object' && ('errorCode' in response || 'errorMessage' in response)) {
					await handleIoTError.call(this, response, itemIndex);
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

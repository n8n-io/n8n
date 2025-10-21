import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleSageMakerError } from './helpers/errorHandler';

import {
	notebookInstanceOperations,
	notebookInstanceFields,
	trainingJobOperations,
	trainingJobFields,
	modelOperations,
	modelFields,
	endpointOperations,
	endpointFields,
} from './descriptions';

export class AwsSageMaker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SageMaker',
		name: 'awsSageMaker',
		icon: 'file:sagemaker.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS SageMaker machine learning platform',
		defaults: {
			name: 'AWS SageMaker',
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
						name: 'Endpoint',
						value: 'endpoint',
					},
					{
						name: 'Model',
						value: 'model',
					},
					{
						name: 'Notebook Instance',
						value: 'notebookInstance',
					},
					{
						name: 'Training Job',
						value: 'trainingJob',
					},
				],
				default: 'notebookInstance',
			},
			...notebookInstanceOperations,
			...notebookInstanceFields,
			...trainingJobOperations,
			...trainingJobFields,
			...modelOperations,
			...modelFields,
			...endpointOperations,
			...endpointFields,
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

				// Handle additional fields for operations that support them
				if (['list'].includes(operation)) {
					const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

					// Merge additional fields into request body
					if (Object.keys(additionalFields).length > 0) {
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}
						Object.assign(requestOptions.body, additionalFields);
					}
				}

				// Handle create operations with additional fields
				if (operation === 'create' && resource === 'notebookInstance') {
					const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;

					if (Object.keys(additionalFields).length > 0) {
						const requestOptions = this.getNodeParameter('$request', itemIndex, {}) as IDataObject;
						if (!requestOptions.body) {
							requestOptions.body = {};
						}

						// Handle SecurityGroupIds as array
						if (additionalFields.SecurityGroupIds) {
							additionalFields.SecurityGroupIds = (additionalFields.SecurityGroupIds as string)
								.split(',')
								.map(id => id.trim());
						}

						Object.assign(requestOptions.body, additionalFields);
					}
				}

				// Make the request using n8n's routing
				response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				// Handle errors
				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleSageMakerError.call(this, response, itemIndex);
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

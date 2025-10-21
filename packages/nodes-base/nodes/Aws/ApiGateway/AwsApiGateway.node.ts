import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleApiGatewayError } from './helpers/errorHandler';

import {
	restApiOperations,
	restApiFields,
	deploymentOperations,
	deploymentFields,
	stageOperations,
	stageFields,
} from './descriptions';

export class AwsApiGateway implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS API Gateway',
		name: 'awsApiGateway',
		icon: 'file:apigateway.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS API Gateway',
		defaults: {
			name: 'AWS API Gateway',
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
						name: 'Deployment',
						value: 'deployment',
					},
					{
						name: 'REST API',
						value: 'restApi',
					},
					{
						name: 'Stage',
						value: 'stage',
					},
				],
				default: 'restApi',
			},
			...restApiOperations,
			...restApiFields,
			...deploymentOperations,
			...deploymentFields,
			...stageOperations,
			...stageFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const response = await this.helpers.requestWithAuthentication.call(this, 'aws', {
					returnFullResponse: false,
					ignoreHttpStatusErrors: true,
				});

				if (response && typeof response === 'object' && ('__type' in response || 'message' in response)) {
					await handleApiGatewayError.call(this, response, itemIndex);
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

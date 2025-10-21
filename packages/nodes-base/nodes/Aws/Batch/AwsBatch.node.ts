import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleBatchError } from './helpers/errorHandler';

import {
	jobOperations,
	jobFields,
	jobQueueOperations,
	jobQueueFields,
	computeEnvironmentOperations,
	computeEnvironmentFields,
} from './descriptions';

export class AwsBatch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Batch',
		name: 'awsBatch',
		icon: 'file:batch.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Batch',
		defaults: {
			name: 'AWS Batch',
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
						name: 'Compute Environment',
						value: 'computeEnvironment',
					},
					{
						name: 'Job',
						value: 'job',
					},
					{
						name: 'Job Queue',
						value: 'jobQueue',
					},
				],
				default: 'job',
			},
			...jobOperations,
			...jobFields,
			...jobQueueOperations,
			...jobQueueFields,
			...computeEnvironmentOperations,
			...computeEnvironmentFields,
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
					await handleBatchError.call(this, response, itemIndex);
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

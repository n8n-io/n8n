import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import { BASE_URL } from './helpers/constants';
import { handleStepFunctionsError } from './helpers/errorHandler';

import {
	stateMachineOperations,
	stateMachineFields,
	executionOperations,
	executionFields,
	activityOperations,
	activityFields,
} from './descriptions';

export class AwsStepFunctions implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Step Functions',
		name: 'awsStepFunctions',
		icon: 'file:stepfunctions.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Step Functions',
		defaults: {
			name: 'AWS Step Functions',
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
				'Content-Type': 'application/x-amz-json-1.0',
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
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Execution',
						value: 'execution',
					},
					{
						name: 'State Machine',
						value: 'stateMachine',
					},
				],
				default: 'stateMachine',
			},
			...stateMachineOperations,
			...stateMachineFields,
			...executionOperations,
			...executionFields,
			...activityOperations,
			...activityFields,
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
					await handleStepFunctionsError.call(this, response, itemIndex);
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

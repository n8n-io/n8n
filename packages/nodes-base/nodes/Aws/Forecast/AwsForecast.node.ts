import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	datasetOperations,
	datasetFields,
	predictorOperations,
	predictorFields,
	forecastOperations,
	forecastFields,
} from './descriptions';

export class AwsForecast implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Forecast',
		name: 'awsForecast',
		icon: 'file:forecast.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Forecast',
		defaults: {
			name: 'AWS Forecast',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
						name: 'Dataset',
						value: 'dataset',
					},
					{
						name: 'Forecast',
						value: 'forecast',
					},
					{
						name: 'Predictor',
						value: 'predictor',
					},
				],
				default: 'dataset',
			},
			...datasetOperations,
			...datasetFields,
			...predictorOperations,
			...predictorFields,
			...forecastOperations,
			...forecastFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

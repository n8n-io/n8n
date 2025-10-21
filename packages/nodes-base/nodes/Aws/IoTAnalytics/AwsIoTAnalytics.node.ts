import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	channelOperations,
	channelFields,
	datasetOperations,
	datasetFields,
	pipelineOperations,
	pipelineFields,
} from './descriptions';

export class AwsIoTAnalytics implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS IoT Analytics',
		name: 'awsIoTAnalytics',
		icon: 'file:iotanalytics.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS IoT Analytics',
		defaults: {
			name: 'AWS IoT Analytics',
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
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Dataset',
						value: 'dataset',
					},
					{
						name: 'Pipeline',
						value: 'pipeline',
					},
				],
				default: 'channel',
			},
			...channelOperations,
			...channelFields,
			...datasetOperations,
			...datasetFields,
			...pipelineOperations,
			...pipelineFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

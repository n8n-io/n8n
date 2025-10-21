import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	campaignOperations,
	campaignFields,
	datasetOperations,
	datasetFields,
	solutionOperations,
	solutionFields,
} from './descriptions';

export class AwsPersonalize implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Personalize',
		name: 'awsPersonalize',
		icon: 'file:personalize.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Personalize',
		defaults: {
			name: 'AWS Personalize',
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
						name: 'Campaign',
						value: 'campaign',
					},
					{
						name: 'Dataset',
						value: 'dataset',
					},
					{
						name: 'Solution',
						value: 'solution',
					},
				],
				default: 'campaign',
			},
			...campaignOperations,
			...campaignFields,
			...datasetOperations,
			...datasetFields,
			...solutionOperations,
			...solutionFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

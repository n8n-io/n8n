import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	findingOperations,
	findingFields,
	classificationJobOperations,
	classificationJobFields,
} from './descriptions';

export class AwsMacie implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Macie',
		name: 'awsMacie',
		icon: 'file:macie.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Macie',
		defaults: {
			name: 'AWS Macie',
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
						name: 'Classification Job',
						value: 'classificationJob',
					},
					{
						name: 'Finding',
						value: 'finding',
					},
				],
				default: 'finding',
			},
			...findingOperations,
			...findingFields,
			...classificationJobOperations,
			...classificationJobFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

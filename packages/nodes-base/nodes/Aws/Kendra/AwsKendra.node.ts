import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	indexOperations,
	indexFields,
	dataSourceOperations,
	dataSourceFields,
	queryOperations,
	queryFields,
} from './descriptions';

export class AwsKendra implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Kendra',
		name: 'awsKendra',
		icon: 'file:kendra.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Kendra',
		defaults: {
			name: 'AWS Kendra',
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
						name: 'Data Source',
						value: 'dataSource',
					},
					{
						name: 'Index',
						value: 'index',
					},
					{
						name: 'Query',
						value: 'query',
					},
				],
				default: 'query',
			},
			...indexOperations,
			...indexFields,
			...dataSourceOperations,
			...dataSourceFields,
			...queryOperations,
			...queryFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

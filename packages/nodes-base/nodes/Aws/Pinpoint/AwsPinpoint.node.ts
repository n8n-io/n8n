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
	templateOperations,
	templateFields,
} from './descriptions';

export class AwsPinpoint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Pinpoint',
		name: 'awsPinpoint',
		icon: 'file:pinpoint.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Pinpoint',
		defaults: {
			name: 'AWS Pinpoint',
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
						name: 'Campaign',
						value: 'campaign',
					},
					{
						name: 'Template',
						value: 'template',
					},
				],
				default: 'campaign',
			},
			...campaignOperations,
			...campaignFields,
			...templateOperations,
			...templateFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

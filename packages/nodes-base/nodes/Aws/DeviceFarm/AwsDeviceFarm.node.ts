import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	projectOperations,
	projectFields,
	devicePoolOperations,
	devicePoolFields,
	runOperations,
	runFields,
} from './descriptions';

export class AwsDeviceFarm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Device Farm',
		name: 'awsDeviceFarm',
		icon: 'file:devicefarm.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Device Farm',
		defaults: {
			name: 'AWS Device Farm',
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
						name: 'Device Pool',
						value: 'devicePool',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Run',
						value: 'run',
					},
				],
				default: 'project',
			},
			...projectOperations,
			...projectFields,
			...devicePoolOperations,
			...devicePoolFields,
			...runOperations,
			...runFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

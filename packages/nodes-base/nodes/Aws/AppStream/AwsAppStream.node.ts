import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	fleetOperations,
	fleetFields,
	stackOperations,
	stackFields,
	imageOperations,
	imageFields,
} from './descriptions';

export class AwsAppStream implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS AppStream',
		name: 'awsAppStream',
		icon: 'file:appstream.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS AppStream',
		defaults: {
			name: 'AWS AppStream',
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
						name: 'Fleet',
						value: 'fleet',
					},
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Stack',
						value: 'stack',
					},
				],
				default: 'fleet',
			},
			...fleetOperations,
			...fleetFields,
			...stackOperations,
			...stackFields,
			...imageOperations,
			...imageFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

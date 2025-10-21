import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	instanceOperations,
	instanceFields,
	contactFlowOperations,
	contactFlowFields,
	userOperations,
	userFields,
} from './descriptions';

export class AwsConnect implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Connect',
		name: 'awsConnect',
		icon: 'file:connect.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Connect',
		defaults: {
			name: 'AWS Connect',
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
						name: 'Contact Flow',
						value: 'contactFlow',
					},
					{
						name: 'Instance',
						value: 'instance',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'instance',
			},
			...instanceOperations,
			...instanceFields,
			...contactFlowOperations,
			...contactFlowFields,
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

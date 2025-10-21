import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	workspaceOperations,
	workspaceFields,
	bundleOperations,
	bundleFields,
} from './descriptions';

export class AwsWorkSpaces implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS WorkSpaces',
		name: 'awsWorkSpaces',
		icon: 'file:workspaces.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS WorkSpaces',
		defaults: {
			name: 'AWS WorkSpaces',
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
						name: 'Bundle',
						value: 'bundle',
					},
					{
						name: 'Workspace',
						value: 'workspace',
					},
				],
				default: 'workspace',
			},
			...workspaceOperations,
			...workspaceFields,
			...bundleOperations,
			...bundleFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

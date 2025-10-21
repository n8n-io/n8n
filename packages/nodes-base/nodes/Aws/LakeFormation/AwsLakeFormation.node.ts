import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	resourceOperations,
	resourceFields,
	dataLakeSettingsOperations,
	dataLakeSettingsFields,
	permissionsOperations,
	permissionsFields,
} from './descriptions';

export class AwsLakeFormation implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Lake Formation',
		name: 'awsLakeFormation',
		icon: 'file:lakeformation.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Lake Formation',
		defaults: {
			name: 'AWS Lake Formation',
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
						name: 'Data Lake Settings',
						value: 'dataLakeSettings',
					},
					{
						name: 'Permissions',
						value: 'permissions',
					},
					{
						name: 'Resource',
						value: 'resource',
					},
				],
				default: 'resource',
			},
			...resourceOperations,
			...resourceFields,
			...dataLakeSettingsOperations,
			...dataLakeSettingsFields,
			...permissionsOperations,
			...permissionsFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

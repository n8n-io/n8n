import type {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { BASE_URL, SERVICE_NAME } from './helpers/constants';
import {
	jobOperations,
	jobFields,
	jobTemplateOperations,
	jobTemplateFields,
	queueOperations,
	queueFields,
} from './descriptions';

export class AwsMediaConvert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS MediaConvert',
		name: 'awsMediaConvert',
		icon: 'file:mediaconvert.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS MediaConvert',
		defaults: {
			name: 'AWS MediaConvert',
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
						name: 'Job',
						value: 'job',
					},
					{
						name: 'Job Template',
						value: 'jobTemplate',
					},
					{
						name: 'Queue',
						value: 'queue',
					},
				],
				default: 'job',
			},
			...jobOperations,
			...jobFields,
			...jobTemplateOperations,
			...jobTemplateFields,
			...queueOperations,
			...queueFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await this.makeRoutingRequest([]);
	}
}

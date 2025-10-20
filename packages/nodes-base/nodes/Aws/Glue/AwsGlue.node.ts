import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { job } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsGlue implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Glue',
		name: 'awsGlue',
		icon: 'file:glue.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS Glue',
		defaults: { name: 'AWS Glue' },
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
				'Accept': 'application/json',
				'Content-Type': 'application/x-amz-json-1.1',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'job',
				options: [
					{
						name: 'Job',
						value: 'job',
					},
				],
			},
			...job.description,
		],
	};
}

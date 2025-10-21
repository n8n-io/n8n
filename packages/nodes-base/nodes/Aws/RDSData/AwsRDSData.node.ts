import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { statement } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsRDSData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS RDS Data API',
		name: 'awsRDSData',
		icon: 'file:rdsdata.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS RDS Data API (Aurora Serverless)',
		defaults: { name: 'AWS RDS Data API' },
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
				'Content-Type': 'application/x-amz-json-1.0',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'statement',
				options: [
					{
						name: 'Statement',
						value: 'statement',
					},
				],
			},
			...statement.description,
		],
	};
}

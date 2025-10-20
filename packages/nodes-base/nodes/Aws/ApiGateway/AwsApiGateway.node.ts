import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { restApi, deployment, stage } from './descriptions';
import { BASE_URL } from './helpers/constants';

export class AwsApiGateway implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS API Gateway',
		name: 'awsApiGateway',
		icon: 'file:apigateway.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with AWS API Gateway',
		defaults: { name: 'AWS API Gateway' },
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
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'restApi',
				options: [
					{
						name: 'REST API',
						value: 'restApi',
					},
					{
						name: 'Deployment',
						value: 'deployment',
					},
					{
						name: 'Stage',
						value: 'stage',
					},
				],
			},
			...restApi.description,
			...deployment.description,
			...stage.description,
		],
	};
}
